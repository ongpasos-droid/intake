#!/usr/bin/env node
/**
 * ORS Filter Behavior Diagnostic
 *
 * Test whether `country` and `legalName` in advancedSearch actually filter.
 * Runs 4 queries and shows first result + count, so we can compare.
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

async function search(body, label) {
  const r = await fetch(`${BASE}/ext-api/organisation-registration/advancedSearch`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      legalName: '', businessName: '', country: '', city: '', website: '',
      pic: '', organisationId: '', registrationNumber: '', vatNumber: '',
      erasmusCharterForHigherEducationCode: '', status: '',
      ...body,
    }),
  });
  const json = await r.json().catch(() => null);
  const arr = Array.isArray(json) ? json : [];
  console.log(`\n[${label}]`);
  console.log('  body:', JSON.stringify(body));
  console.log(`  HTTP ${r.status} — ${arr.length} results`);
  for (const e of arr.slice(0, 3)) {
    console.log(`    • "${(e.legalName || '').trim().slice(0, 50)}" | country=${e.country} | city="${(e.city || '').trim()}"`);
  }
  // Country distribution of all 200
  if (arr.length > 0) {
    const byCountry = {};
    for (const e of arr) byCountry[e.country || 'null'] = (byCountry[e.country || 'null'] || 0) + 1;
    const top = Object.entries(byCountry).sort((a,b) => b[1]-a[1]).slice(0, 5);
    console.log(`  country distribution in response (top 5): ${top.map(([k,v]) => `${k}:${v}`).join(', ')}`);
  }
}

async function main() {
  console.log('=== Filter behavior probe ===');

  await search({}, 'EMPTY body');
  await new Promise(r => setTimeout(r, 1100));

  await search({ country: '20000883' }, 'country=ES only');
  await new Promise(r => setTimeout(r, 1100));

  await search({ country: '20000922' }, 'country=IT only');
  await new Promise(r => setTimeout(r, 1100));

  await search({ legalName: 'Permacultura' }, 'legalName=Permacultura (no country)');
  await new Promise(r => setTimeout(r, 1100));

  await search({ country: '20000883', legalName: 'Permacultura' }, 'ES + legalName=Permacultura');
  await new Promise(r => setTimeout(r, 1100));

  await search({ organisationId: 'E10151149' }, 'by OID (Permacultura Cantabria)');
  await new Promise(r => setTimeout(r, 1100));

  await search({ pic: '940435371' }, 'by PIC (Permacultura Cantabria)');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
