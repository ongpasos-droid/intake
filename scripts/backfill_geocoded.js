#!/usr/bin/env node
/**
 * Backfill `entities.geocoded_lat/lng` desde:
 *   1) data/cities_curated.json (lookup ISO2_<city_norm> → [lat, lng])
 *   2) data/cities5000.txt (opcional, GeoNames dump si está presente)
 *   3) data/country_centroids.json (fallback con jitter ±0.4°)
 *
 * Idempotente: solo procesa filas con geocoded_lat IS NULL.
 *
 * Uso:
 *   node scripts/backfill_geocoded.js              # bulk de todo lo pendiente
 *   node scripts/backfill_geocoded.js --rebuild    # recalcula city_centroid (pierde fuentes manuales)
 *   node scripts/backfill_geocoded.js --limit 100  # debug
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CITIES_FILE   = path.join(DATA_DIR, 'cities_curated.json');
const COUNTRIES_FILE = path.join(DATA_DIR, 'country_centroids.json');
const GEONAMES_FILE  = path.join(DATA_DIR, 'cities5000.txt');

const argv = process.argv.slice(2);
const rebuildAll = argv.includes('--rebuild');
const limitArg = argv.find(a => a.startsWith('--limit'));
const limit = limitArg ? parseInt(limitArg.split('=')[1] || argv[argv.indexOf(limitArg) + 1], 10) : null;

/* Strip diacritics + lowercase + normalize whitespace */
function normCity(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCurated() {
  const raw = JSON.parse(fs.readFileSync(CITIES_FILE, 'utf8'));
  delete raw._comment;
  // Build a Map for fast lookup, normalizing keys city names
  const idx = new Map();
  for (const [key, val] of Object.entries(raw)) {
    const m = key.match(/^([A-Z]{2})_(.+)$/);
    if (!m) continue;
    const cc = m[1];
    const cityNorm = normCity(m[2]);
    idx.set(`${cc}|${cityNorm}`, val);
  }
  return idx;
}

function loadGeoNames() {
  if (!fs.existsSync(GEONAMES_FILE)) return null;
  console.log('  → Loading GeoNames cities5000.txt …');
  const idx = new Map();
  const lines = fs.readFileSync(GEONAMES_FILE, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line) continue;
    const cols = line.split('\t');
    if (cols.length < 9) continue;
    const asciiName = cols[2];
    const altNames  = cols[3];
    const lat = parseFloat(cols[4]);
    const lng = parseFloat(cols[5]);
    const cc  = cols[8];
    if (!cc || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const ccUp = cc.toUpperCase();
    const primary = normCity(asciiName);
    if (primary) {
      const key = `${ccUp}|${primary}`;
      if (!idx.has(key)) idx.set(key, [lat, lng]);
    }
    if (altNames) {
      for (const alt of altNames.split(',')) {
        const a = normCity(alt);
        if (!a) continue;
        const key = `${ccUp}|${a}`;
        if (!idx.has(key)) idx.set(key, [lat, lng]);
      }
    }
  }
  console.log(`  → GeoNames index: ${idx.size} city aliases`);
  return idx;
}

function loadCountries() {
  return JSON.parse(fs.readFileSync(COUNTRIES_FILE, 'utf8'));
}

async function main() {
  const curated = loadCurated();
  const geonames = loadGeoNames();
  const countries = loadCountries();

  console.log(`✓ ${curated.size} curated cities`);
  if (!geonames) console.log('  (GeoNames cities5000.txt no encontrado — opcional, descargar de https://download.geonames.org/export/dump/cities5000.zip)');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eplus_tools',
    multipleStatements: false,
  });

  const where = rebuildAll
    ? `geocoded_source IN ('city_centroid','country_centroid') OR geocoded_lat IS NULL`
    : `geocoded_lat IS NULL`;

  const sql = `SELECT oid, city, country_code FROM entities WHERE ${where}` + (limit ? ` LIMIT ${limit}` : '');
  const [rows] = await conn.query(sql);
  console.log(`📍 ${rows.length} entities to geocode`);

  let nCurated = 0, nGeo = 0, nCountry = 0, nSkip = 0;

  for (const row of rows) {
    const cc = (row.country_code || '').toUpperCase();
    const cityKey = `${cc}|${normCity(row.city)}`;
    let lat, lng, source;

    if (cc && row.city && curated.has(cityKey)) {
      [lat, lng] = curated.get(cityKey);
      // Jitter pequeño (~500m) para que entidades en la misma ciudad no se apilen
      // exactamente en el mismo pixel. El centroide ciudad es aproximación; cuando
      // se geocodifique la dirección real (Mapbox), source pasa a 'mapbox' y se
      // sobreescribe con la coord exacta.
      lat += (Math.random() - 0.5) * 0.012;
      lng += (Math.random() - 0.5) * 0.012;
      source = 'city_centroid';
      nCurated++;
    } else if (cc && row.city && geonames && geonames.has(cityKey)) {
      [lat, lng] = geonames.get(cityKey);
      lat += (Math.random() - 0.5) * 0.012;
      lng += (Math.random() - 0.5) * 0.012;
      source = 'city_centroid';
      nGeo++;
    } else if (cc && countries[cc]) {
      [lat, lng] = countries[cc];
      // jitter para que no se apilen todos en el mismo punto
      lat += (Math.random() - 0.5) * 0.8;
      lng += (Math.random() - 0.5) * 0.8;
      source = 'country_centroid';
      nCountry++;
    } else {
      nSkip++;
      continue;
    }

    await conn.execute(
      `UPDATE entities SET geocoded_lat=?, geocoded_lng=?, geocoded_source=?, geocoded_at=NOW() WHERE oid=?`,
      [lat.toFixed(6), lng.toFixed(6), source, row.oid]
    );
  }

  console.log(`\n✅ Done`);
  console.log(`   curated city: ${nCurated}`);
  console.log(`   geonames:     ${nGeo}`);
  console.log(`   country (jit): ${nCountry}`);
  console.log(`   skipped:      ${nSkip}`);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
