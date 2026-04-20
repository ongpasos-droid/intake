#!/usr/bin/env node
/**
 * ORS Crawl Entry Point
 * Usage:
 *   node scripts/crawl_ors.js --country=ES
 *   node scripts/crawl_ors.js --country=ES --dry-run --max-prefixes=3
 *   node scripts/crawl_ors.js --all
 *
 * Sends Telegram reports on: country start, country finish, errors, every 50 prefixes.
 * Spec: docs/ORS_CRAWL_SPEC.md §7, §10
 */
require('dotenv').config();
const ors = require('../node/src/modules/entities/ors_client');
const crawler = require('../node/src/modules/entities/ors_crawler');
const pool = require('../node/src/utils/db');

const priorityCountries = require('./ors_priority_countries.json');

// Telegram config
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8695918145:AAHkWahytlmei-OHEAWwGyS7Q1d1S6MVBHg';
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '848223828';
const REPORT_EVERY_N_PREFIXES = 50;

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TG_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });
  } catch (err) {
    console.error(`[telegram] Failed to send: ${err.message}`);
  }
}

async function getGlobalStats() {
  const [entities] = await pool.execute(
    'SELECT country_code, COUNT(*) AS cnt FROM entities GROUP BY country_code ORDER BY cnt DESC'
  );
  const [total] = await pool.execute('SELECT COUNT(*) AS cnt FROM entities');
  return { byCountry: entities, total: total[0].cnt };
}

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      args[key] = val === undefined ? true : val;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const dryRun = !!args['dry-run'];
  const maxPrefixes = args['max-prefixes'] ? parseInt(args['max-prefixes'], 10) : (dryRun ? 3 : Infinity);

  console.log('=== ORS Crawl ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'FULL'}`);

  // Fetch country taxonomy
  console.log('Fetching country taxonomy...');
  let countries;
  try {
    countries = await ors.getCountries();
    const countryCount = Array.isArray(countries) ? countries.length : Object.keys(countries).length;
    console.log(`  Got ${countryCount} countries from ORS`);
  } catch (err) {
    console.error(`FATAL: Cannot fetch country taxonomy: ${err.message}`);
    await sendTelegram(`🔴 <b>ORS Crawl FATAL</b>\nNo puedo obtener taxonomía de países: ${err.message}`);
    process.exit(1);
  }

  const isoToTax = crawler.buildISOToTaxMap(countries);

  // Determine which countries to crawl
  let targetCountries = [];

  if (args.country) {
    const iso = args.country.toUpperCase();
    const taxId = isoToTax.get(iso);
    if (!taxId) {
      console.error(`ERROR: Country ${iso} not found in ORS taxonomy.`);
      process.exit(1);
    }
    targetCountries = [{ iso, taxId }];
  } else if (args.all) {
    targetCountries = priorityCountries
      .map(c => ({ iso: c.iso, taxId: isoToTax.get(c.iso) }))
      .filter(c => {
        if (!c.taxId) {
          console.warn(`  WARNING: ${c.iso} not found in taxonomy, skipping`);
          return false;
        }
        return true;
      });
  } else {
    console.error('Usage: --country=ES or --all');
    process.exit(1);
  }

  const countryList = targetCountries.map(c => c.iso).join(', ');
  console.log(`Crawling ${targetCountries.length} country(s): ${countryList}`);

  await sendTelegram(
    `🟢 <b>ORS Crawl iniciado</b>\n` +
    `Modo: ${dryRun ? 'DRY RUN' : 'COMPLETO'}\n` +
    `Países: ${targetCountries.length} (${countryList})`
  );

  // Reset stale in_progress prefixes (from interrupted runs)
  await pool.execute(
    `UPDATE ors_crawl_state SET status = 'pending' WHERE status = 'in_progress'`
  );

  const startTime = Date.now();

  // Crawl each country sequentially
  for (let i = 0; i < targetCountries.length; i++) {
    const { iso, taxId } = targetCountries[i];
    const countryStart = Date.now();

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Country ${i + 1}/${targetCountries.length}: ${iso} (taxId: ${taxId})`);
    console.log('='.repeat(50));

    await sendTelegram(
      `🔵 <b>Crawling ${iso}</b> (${i + 1}/${targetCountries.length})\n` +
      `TaxID: ${taxId}`
    );

    try {
      const result = await crawler.crawlCountry(taxId, iso, {
        dryRun,
        maxPrefixes,
        onProgress: async (stats) => {
          // Called every prefix — we report every N
          if (stats.processedCount > 0 && stats.processedCount % REPORT_EVERY_N_PREFIXES === 0) {
            const [entRows] = await pool.execute(
              'SELECT COUNT(*) AS cnt FROM entities WHERE country_code = ?', [iso]
            );
            await sendTelegram(
              `📊 <b>Progreso ${iso}</b>\n` +
              `Prefijos: ${stats.processedCount} procesados\n` +
              `Entidades ${iso}: ${entRows[0].cnt}\n` +
              `Capped: ${stats.cappedPrefixes} | Pendientes en cola: ${stats.queueLength}`
            );
          }
        },
      });

      // Country finished — full report
      const progress = await crawler.getProgress(taxId);
      const [entRows] = await pool.execute(
        'SELECT COUNT(*) AS cnt FROM entities WHERE country_code = ?', [iso]
      );
      const elapsed = Math.round((Date.now() - countryStart) / 60000);

      const summary =
        `✅ <b>${iso} completado</b> (${i + 1}/${targetCountries.length})\n` +
        `Entidades: ${entRows[0].cnt}\n` +
        `Prefijos: ${progress.done} done, ${progress.capped} capped, ${progress.errors} errors\n` +
        `Tiempo: ${elapsed} min\n` +
        `Upserts en este run: ${result.totalEntities}`;

      console.log(summary.replace(/<[^>]+>/g, ''));
      await sendTelegram(summary);

    } catch (err) {
      console.error(`ERROR crawling ${iso}: ${err.message}`);
      await sendTelegram(
        `🔴 <b>Error en ${iso}</b>\n${err.message.slice(0, 300)}\n\nContinuando con el siguiente país...`
      );
    }
  }

  // Final global report
  const stats = await getGlobalStats();
  const totalElapsed = Math.round((Date.now() - startTime) / 60000);
  const topCountries = stats.byCountry.slice(0, 10)
    .map(c => `  ${c.country_code}: ${c.cnt}`)
    .join('\n');

  const finalReport =
    `🏁 <b>ORS Crawl TERMINADO</b>\n` +
    `Tiempo total: ${totalElapsed} min\n` +
    `Total entidades: ${stats.total}\n\n` +
    `<b>Top 10 países:</b>\n${topCountries}`;

  console.log(finalReport.replace(/<[^>]+>/g, ''));
  await sendTelegram(finalReport);

  await pool.end();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await sendTelegram(`🔴 <b>ORS Crawl CRASH</b>\n${err.message}`);
  process.exit(1);
});
