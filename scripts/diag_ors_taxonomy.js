#!/usr/bin/env node
/**
 * ORS Taxonomy + Search Diagnostic
 *
 * Checks whether the taxonomy IDs the crawler is using for each country
 * are the ones the ORS API currently expects, and runs a test query per
 * country to see if results come back.
 *
 * Why: after the crawl for IT/PT/FR/DE/NL/BE all reported "0 entidades"
 * but "1284 done, 12 errors" (== 1296 = 36^2 2-letter prefixes), we need
 * to know if the API is silently returning [] for wrong taxIDs.
 *
 * Usage: node scripts/diag_ors_taxonomy.js
 * No DB access. Hits only the public ORS endpoint. No writes. ~15s.
 */

const BASE = 'https://webgate.ec.europa.eu/eac-eescp-backend';
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json, text/plain, */*',
  'X-Lang-Param': 'en',
  'Origin': 'https://webgate.ec.europa.eu',
  'Referer': 'https://webgate.ec.europa.eu/erasmus-esc/index/organisations/search-for-an-organisation',
  'User-Agent': 'Mozilla/5.0 (compatible; EufundingSchoolDiag/1.0)',
};

// Reported by the Telegram run (what the crawler believes each country's taxID is).
const REPORTED_TAXIDS = {
  ES: null,           // not shown in the messages Oscar shared — will be derived
  IT: null,           // not explicitly shown
  PT: '20000990',
  FR: '20000890',
  DE: '20000873',
  NL: '20000973',
  BE: '20000839',
};

async function fetchJson(url, init) {
  const r = await fetch(url, init);
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  return { status: r.status, ok: r.ok, json, text };
}

async function getCountries() {
  return fetchJson(`${BASE}/configuration/countries`, { headers: HEADERS });
}

async function advancedSearch(country, legalName) {
  return fetchJson(`${BASE}/ext-api/organisation-registration/advancedSearch`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      legalName, businessName: '', country, city: '', website: '',
      pic: '', organisationId: '', registrationNumber: '', vatNumber: '',
      erasmusCharterForHigherEducationCode: '', status: '',
    }),
  });
}

function buildISOToTaxMap(raw) {
  const entries = Array.isArray(raw) ? raw : Object.values(raw || {});
  const map = {};
  for (const c of entries) {
    if (c && c.id && c.code) map[String(c.code).toUpperCase()] = String(c.id);
  }
  return map;
}

async function main() {
  console.log('=== ORS Taxonomy + Search Diagnostic ===\n');

  console.log('[1/3] GET /configuration/countries ...');
  const countriesResp = await getCountries();
  if (!countriesResp.ok) {
    console.error(`  FAIL: HTTP ${countriesResp.status}`);
    console.error(`  Body: ${countriesResp.text.slice(0, 400)}`);
    process.exit(1);
  }
  const raw = countriesResp.json;
  const entryCount = Array.isArray(raw) ? raw.length : Object.keys(raw || {}).length;
  console.log(`  OK — ${entryCount} entries. Shape: ${Array.isArray(raw) ? 'array' : 'object'}`);
  if (entryCount === 0) {
    console.error('  EMPTY payload — investigate.');
    process.exit(1);
  }

  // Show raw shape of first entry so buildISOToTaxMap bugs are obvious
  const firstEntry = Array.isArray(raw) ? raw[0] : raw[Object.keys(raw)[0]];
  console.log('  First entry keys:', Object.keys(firstEntry || {}).join(', '));
  console.log('  First entry sample:', JSON.stringify(firstEntry).slice(0, 200));

  const isoToTax = buildISOToTaxMap(raw);
  console.log(`  Built ISO->tax map: ${Object.keys(isoToTax).length} entries`);

  console.log('\n[2/3] Compare reported taxIDs vs live API');
  const CHECK_ISO = ['ES', 'IT', 'PT', 'FR', 'DE', 'NL', 'BE', 'GR', 'PL', 'RO'];
  console.log('  ISO | reported (crawler) | live (API)        | match');
  console.log('  ----|--------------------|-------------------|------');
  for (const iso of CHECK_ISO) {
    const live = isoToTax[iso] || '(missing)';
    const rep  = REPORTED_TAXIDS[iso] || '(unknown)';
    const match = rep === live ? 'OK' : (rep === '(unknown)' ? '?' : 'MISMATCH');
    console.log(`  ${iso.padEnd(3)} | ${String(rep).padEnd(18)} | ${String(live).padEnd(17)} | ${match}`);
  }

  console.log('\n[3/3] Test search for each country (legalName="aa")');
  console.log('  If the API returns results, the taxID is correct and the crawl issue is elsewhere.');
  console.log('  If it returns [], the taxID is wrong or the API rejects it.\n');

  for (const iso of CHECK_ISO) {
    const taxId = isoToTax[iso];
    if (!taxId) {
      console.log(`  ${iso}: SKIP (no taxID in live taxonomy)`);
      continue;
    }
    try {
      const r = await advancedSearch(taxId, 'aa');
      const count = Array.isArray(r.json) ? r.json.length : -1;
      const sample = count > 0 ? ` — first: "${(r.json[0].legalName || '').trim().slice(0, 60)}"` : '';
      console.log(`  ${iso} (tax=${taxId}): HTTP ${r.status}, ${count} results${sample}`);
    } catch (err) {
      console.log(`  ${iso} (tax=${taxId}): ERROR ${err.message}`);
    }
    await new Promise(res => setTimeout(res, 1100));
  }

  console.log('\n=== Done. ===');
  console.log('If matches are OK and results are >0 but the crawler reports 0 entidades,');
  console.log('the bug is in ors_client.js (transport) or ors_crawler.js (upsert/skip logic),');
  console.log('not in the taxonomy.');
}

main().catch(err => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
