#!/usr/bin/env node
/**
 * enrich-batch.js — Run the website enrichment crawler over a batch of
 * entities and upsert results into entity_enrichment.
 *
 * Inputs (mutually exclusive):
 *   --input-csv <path>   Path to a CSV with columns: oid,legal_name,country_code,website
 *   --input-mysql         Read directly from entities table (prod / VPS)
 *
 * Common flags:
 *   --limit <N>          Max rows to process (default: all)
 *   --concurrency <N>    Parallel fetches (default: 5)
 *   --skip-recent-days <N>  Skip rows fetched within this many days (default: 30)
 *   --per-domain-ms <N>  Min ms between requests to same host (default: 1500)
 *   --dry-run            Do not write to DB
 *   --verbose            Extra per-row logging
 *
 * Examples:
 *   node scripts/enrich-batch.js --input-csv tmp/enrichment-sample-100.csv --limit 100
 *   node scripts/enrich-batch.js --input-mysql --limit 500 --concurrency 8
 */

require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const pool = require('../node/src/utils/db');
const { validateAndNormalize } = require('../node/src/modules/enrichment/url-validator');
const { fetchPage } = require('../node/src/modules/enrichment/fetcher');
const { extract } = require('../node/src/modules/enrichment/extractor');
const {
  detectLegalForm, detectEuPrograms, hasErasmusAccreditation, hasEtwinningLabel,
  detectCms, nameMatchesDomain, detectMismatchLevel,
} = require('../node/src/modules/enrichment/classifiers');
const { computeScores } = require('../node/src/modules/enrichment/scorer');
const { upsertEnrichment, getAlreadyFetchedOids } = require('../node/src/modules/enrichment/model');

// ── CLI ──────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    'input-csv': { type: 'string' },
    'input-mysql': { type: 'boolean' },
    limit: { type: 'string' },
    concurrency: { type: 'string', default: '5' },
    'skip-recent-days': { type: 'string', default: '30' },
    'per-domain-ms': { type: 'string', default: '1500' },
    'dry-run': { type: 'boolean' },
    verbose: { type: 'boolean' },
  },
});

if (!args['input-csv'] && !args['input-mysql']) {
  console.error('ERROR: specify --input-csv <path> or --input-mysql');
  process.exit(2);
}

const LIMIT = args.limit ? parseInt(args.limit, 10) : Number.POSITIVE_INFINITY;
const CONCURRENCY = parseInt(args.concurrency, 10);
const SKIP_RECENT_DAYS = parseInt(args['skip-recent-days'], 10);
const PER_DOMAIN_MS = parseInt(args['per-domain-ms'], 10);

// ── Minimal CSV parser ───────────────────────────────────────────
function parseCsv(content) {
  const rows = [];
  let cur = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (inQuotes) {
      if (c === '"' && content[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') { /* ignore */ }
      else { field += c; }
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).filter(r => r.length > 0 && r.some(f => f !== ''))
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// ── Load inputs ──────────────────────────────────────────────────
async function loadFromCsv(filepath) {
  const abs = path.resolve(filepath);
  const content = fs.readFileSync(abs, 'utf8');
  return parseCsv(content);
}

async function loadFromMysql(limit) {
  const [rows] = await pool.query(
    `SELECT e.oid, e.legal_name, e.country_code, e.website
     FROM entities e
     LEFT JOIN entity_enrichment ee ON ee.oid = e.oid
         AND ee.last_fetched_at > DATE_SUB(NOW(), INTERVAL ? DAY)
     WHERE e.website IS NOT NULL
       AND e.website <> ''
       AND e.website REGEXP '^https?://'
       AND ee.oid IS NULL
     LIMIT ?`,
    [SKIP_RECENT_DAYS, limit],
  );
  return rows;
}

// ── Per-domain rate limiter ──────────────────────────────────────
const lastHostFetch = new Map();
async function rateLimitDomain(host) {
  const last = lastHostFetch.get(host) || 0;
  const wait = PER_DOMAIN_MS - (Date.now() - last);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastHostFetch.set(host, Date.now());
}

// ── Process single row ───────────────────────────────────────────
async function processRow(row, stats) {
  const oid = row.oid;
  const website = row.website;
  const declaredCountry = row.country_code;
  const legalName = row.legal_name;

  // 1. URL validation
  const v = validateAndNormalize(website);
  if (!v.ok) {
    stats.errors[v.error_type] = (stats.errors[v.error_type] || 0) + 1;
    if (!args['dry-run']) {
      await upsertEnrichment({
        oid,
        first_fetched_at: new Date(),
        error_type: v.error_type,
        error_message: `URL rejected at validation: ${website}`,
        final_url: v.url || null,
      });
    }
    if (args.verbose) console.log(`  ${oid} REJECT ${v.error_type}`);
    return;
  }

  // 2. Rate limit and fetch
  await rateLimitDomain(v.host);
  const fetched = await fetchPage(v.url);
  if (!fetched.ok) {
    stats.errors[fetched.error_type] = (stats.errors[fetched.error_type] || 0) + 1;
    if (!args['dry-run']) {
      await upsertEnrichment({
        oid,
        first_fetched_at: new Date(),
        error_type: fetched.error_type,
        error_message: fetched.error_message,
        http_status_final: fetched.http_status_final || null,
        redirect_chain: fetched.redirect_chain || null,
        final_url: fetched.final_url || v.url,
      });
    }
    if (args.verbose) console.log(`  ${oid} FAIL ${fetched.error_type}`);
    return;
  }

  // 3. Extract
  const extracted = extract(fetched.html, fetched.final_url);

  // 3b. Soft-404: page returned 200 but content signals it's parked / not
  // the real site / under construction. Record as error type, skip scoring.
  if (extracted.soft_404) {
    stats.errors['soft_404'] = (stats.errors['soft_404'] || 0) + 1;
    if (!args['dry-run']) {
      await upsertEnrichment({
        oid,
        first_fetched_at: new Date(),
        error_type: 'soft_404',
        error_message: 'Page returned 200 but content indicates parked/not-found/coming-soon',
        http_status_final: fetched.http_status_final,
        redirect_chain: fetched.redirect_chain.length > 0 ? fetched.redirect_chain : null,
        final_url: fetched.final_url,
        ssl_valid: fetched.ssl_valid ? 1 : 0,
        content_hash: extracted.content_hash,
      });
    }
    if (args.verbose) console.log(`  ${oid} SOFT_404 ${v.host}`);
    return;
  }

  // 4. Classify
  const euPrograms = detectEuPrograms(extracted._plain_text_snippet);
  const legalForm = detectLegalForm(legalName, extracted._plain_text_snippet);
  const cms = detectCms(fetched.html, fetched.final_url);
  const nameMatch = nameMatchesDomain(legalName, fetched.final_url);
  const mismatch = detectMismatchLevel(declaredCountry, fetched.final_url, fetched.redirect_chain);

  // 5. Score
  const merged = {
    ...extracted,
    ssl_valid: fetched.ssl_valid,
    eu_programs: euPrograms,
    name_matches_domain: nameMatch,
    mismatch_level: mismatch,
    cms_detected: cms,
  };
  const scores = computeScores(merged);

  // 6. Persist
  const dbRow = {
    oid,
    first_fetched_at: new Date(),
    http_status_final: fetched.http_status_final,
    redirect_chain: fetched.redirect_chain.length > 0 ? fetched.redirect_chain : null,
    final_url: fetched.final_url,
    ssl_valid: fetched.ssl_valid ? 1 : 0,
    content_hash: extracted.content_hash,
    extracted_name: extracted.extracted_name,
    description: extracted.description,
    legal_form: legalForm,
    year_founded: extracted.year_founded,
    vat_number: extracted.vat_number,
    tax_id_national: extracted.tax_id_national,
    oid_erasmus_on_site: extracted.oid_erasmus_on_site,
    pic_on_site: extracted.pic_on_site,
    emails: extracted.emails,
    phones: extracted.phones,
    addresses: extracted.addresses,
    website_languages: extracted.website_languages,
    social_links: extracted.social_links,
    cms_detected: cms,
    copyright_year: extracted.copyright_year,
    last_news_date: extracted.last_news_date,
    logo_url: extracted.logo_url,
    sitemap_lastmod: extracted.sitemap_lastmod,
    eu_programs: euPrograms,
    has_erasmus_accreditation: hasErasmusAccreditation(euPrograms),
    has_etwinning_label: hasEtwinningLabel(euPrograms, extracted._plain_text_snippet),
    students_count: extracted.students_count,
    teachers_count: extracted.teachers_count,
    has_donate_button: extracted.has_donate_button,
    has_newsletter_signup: extracted.has_newsletter_signup,
    has_privacy_policy: extracted.has_privacy_policy,
    ...scores,
    mismatch_level: mismatch,
    name_matches_domain: nameMatch,
    likely_squatted: scores.score_squat_risk >= 60 ? 1 : 0,
  };
  if (!args['dry-run']) await upsertEnrichment(dbRow);
  stats.ok++;
  if (args.verbose) {
    console.log(`  ${oid} OK  ${fetched.http_status_final}  ${v.host}  scores P=${scores.score_professionalism} EU=${scores.score_eu_readiness} V=${scores.score_vitality} SQ=${scores.score_squat_risk}`);
  }
}

// ── Concurrency pool ─────────────────────────────────────────────
async function runPool(items, concurrency, handler) {
  const queue = items.slice();
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) return;
      try { await handler(item); } catch (e) { console.error(`error on ${item.oid}:`, e.message); }
    }
  });
  await Promise.all(workers);
}

// ── Main ─────────────────────────────────────────────────────────
(async () => {
  const t0 = Date.now();
  console.log('Enrichment batch starting.');
  console.log('  mode:', args['input-mysql'] ? 'mysql' : `csv (${args['input-csv']})`);
  console.log('  limit:', Number.isFinite(LIMIT) ? LIMIT : 'all');
  console.log('  concurrency:', CONCURRENCY);
  console.log('  per-domain-ms:', PER_DOMAIN_MS);
  console.log('  dry-run:', !!args['dry-run']);

  let rows;
  if (args['input-csv']) {
    rows = await loadFromCsv(args['input-csv']);
  } else {
    rows = await loadFromMysql(Number.isFinite(LIMIT) ? LIMIT : 1000);
  }
  rows = rows.slice(0, LIMIT);
  console.log(`Loaded ${rows.length} row(s).`);

  // Skip already-enriched (CSV mode: we still want to respect --skip-recent-days)
  if (!args['dry-run']) {
    const existing = await getAlreadyFetchedOids(rows.map(r => r.oid), SKIP_RECENT_DAYS);
    if (existing.size > 0) {
      rows = rows.filter(r => !existing.has(r.oid));
      console.log(`Skipped ${existing.size} already-enriched within ${SKIP_RECENT_DAYS} days.`);
    }
  }

  const stats = { ok: 0, errors: {} };
  await runPool(rows, CONCURRENCY, (r) => processRow(r, stats));

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n=== Done ===');
  console.log(`Processed ${rows.length} in ${secs}s — OK ${stats.ok}, errors:`);
  for (const [k, v] of Object.entries(stats.errors).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  await pool.end();
})().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
