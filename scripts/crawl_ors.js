#!/usr/bin/env node
/**
 * ORS Global Crawl Entry Point
 *
 * The ORS advancedSearch endpoint silently ignores the `country` filter, so
 * we do ONE global sweep across legalName prefixes (aa..99 → deeper when
 * capped) and tag each entity with its real country from the response.
 *
 * Usage:
 *   node scripts/crawl_ors.js
 *   node scripts/crawl_ors.js --dry-run --max-prefixes=10
 *
 * Spec: docs/ORS_CRAWL_SPEC.md §7, §10
 */
require('dotenv').config();
const ors = require('../node/src/modules/entities/ors_client');
const crawler = require('../node/src/modules/entities/ors_crawler');
const pool = require('../node/src/utils/db');

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8695918145:AAHkWahytlmei-OHEAWwGyS7Q1d1S6MVBHg';
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '848223828';
const REPORT_INTERVAL_MS = 30 * 60 * 1000; // 30 min between progress reports

async function sendTelegram(text) {
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error(`[telegram] Failed to send: ${err.message}`);
  }
}

async function getGlobalStats() {
  const [byCountry] = await pool.execute(
    `SELECT country_code, COUNT(*) AS cnt FROM entities
     WHERE country_code IS NOT NULL
     GROUP BY country_code ORDER BY cnt DESC`
  );
  const [total] = await pool.execute('SELECT COUNT(*) AS cnt FROM entities');
  return { byCountry, total: total[0].cnt };
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
  const maxPrefixes = args['max-prefixes']
    ? parseInt(args['max-prefixes'], 10)
    : (dryRun ? 3 : Infinity);

  console.log('=== ORS Global Crawl ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'FULL'}`);

  // Country taxonomy (used only to resolve raw.country → ISO on upsert)
  let countries;
  try {
    countries = await ors.getCountries();
  } catch (err) {
    console.error(`FATAL: Cannot fetch country taxonomy: ${err.message}`);
    await sendTelegram(`🔴 <b>ORS Crawl FATAL</b>\nNo puedo obtener taxonomía de países: ${err.message}`);
    process.exit(1);
  }
  const taxToISO = crawler.buildCountryMap(countries);
  console.log(`  Loaded ${taxToISO.size} country mappings`);

  // Reset stale in_progress prefixes (from interrupted runs)
  await pool.execute(
    `UPDATE ors_crawl_state SET status = 'pending'
     WHERE country_tax_id = ? AND status = 'in_progress'`,
    [crawler.GLOBAL_TAX_ID]
  );

  await sendTelegram(
    `🟢 <b>ORS Crawl global iniciado</b>\n` +
    `Modo: ${dryRun ? 'DRY RUN' : 'COMPLETO'}\n` +
    `Barrido único por prefijo de nombre (país se resuelve del response).`
  );

  const startTime = Date.now();
  const reportState = { lastReport: 0 };

  const result = await crawler.crawlGlobal(taxToISO, {
    dryRun,
    maxPrefixes,
    onProgress: async (stats) => {
      const now = Date.now();
      if (now - reportState.lastReport >= REPORT_INTERVAL_MS) {
        reportState.lastReport = now;
        const globalStats = await getGlobalStats();
        const top5 = globalStats.byCountry.slice(0, 5)
          .map(c => `  ${c.country_code}: ${c.cnt}`).join('\n');
        await sendTelegram(
          `📊 <b>Progreso global</b>\n` +
          `Prefijos procesados: ${stats.processedCount}\n` +
          `Upserts en este run: ${stats.totalEntities}\n` +
          `Total global: ${globalStats.total}\n` +
          `Capped: ${stats.cappedPrefixes} | Saturados: ${stats.saturatedSkipped} | Pendientes: ${stats.queueLength}\n\n` +
          `<b>Top 5:</b>\n${top5}`
        );
      }
    },
  });

  const stats = await getGlobalStats();
  const totalElapsed = Math.round((Date.now() - startTime) / 60000);
  const top10 = stats.byCountry.slice(0, 10)
    .map(c => `  ${c.country_code}: ${c.cnt}`).join('\n');

  const finalReport =
    `🏁 <b>ORS Crawl global TERMINADO</b>\n` +
    `Tiempo total: ${totalElapsed} min\n` +
    `Prefijos procesados: ${result.processedCount}\n` +
    `Upserts en este run: ${result.totalEntities}\n` +
    `Total entidades en DB: ${stats.total}\n` +
    `Países distintos: ${stats.byCountry.length}\n\n` +
    `<b>Top 10 países:</b>\n${top10}`;

  console.log(finalReport.replace(/<[^>]+>/g, ''));
  await sendTelegram(finalReport);

  await pool.end();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await sendTelegram(`🔴 <b>ORS Crawl CRASH</b>\n${err.message}`);
  process.exit(1);
});
