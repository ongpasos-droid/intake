/**
 * Migration 091 — Backfill `entities.geocoded_lat/lng` en cada deploy.
 *
 * Equivalente a `node scripts/backfill_geocoded.js`, pero corre dentro del
 * runner de migraciones para que producción quede geocodificada sin pasos
 * manuales tras el deploy. Idempotente: solo procesa filas pendientes
 * (geocoded_lat IS NULL), así que tras el primer deploy no hace nada.
 *
 * Fuentes:
 *   1) data/cities_curated.json   (city_centroid, ~500m de jitter)
 *   2) data/country_centroids.json (country_centroid, ±0.4° de jitter)
 *
 * Updates batched en chunks de BATCH_SIZE filas con CASE WHEN para evitar
 * 288k round-trips a MySQL (que tardaban >10min y rompían el healthcheck
 * de Coolify provocando 502 Bad Gateway).
 */
const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 500;

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

module.exports = async function (conn) {
  // 1. Comprobar precondiciones (entities + columnas geocoded)
  const [t] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entities'`
  );
  if (!t.length) {
    console.log('    ⊘ 091 skip: entities table missing');
    return;
  }
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entities'
       AND COLUMN_NAME = 'geocoded_lat'`
  );
  if (!cols.length) {
    console.log('    ⊘ 091 skip: geocoded_lat column missing (migración 084 no aplicada)');
    return;
  }

  // 2. ¿Hay filas pendientes? (idempotencia)
  const [pendingRows] = await conn.query(
    `SELECT COUNT(*) AS n FROM entities WHERE geocoded_lat IS NULL`
  );
  const pending = pendingRows[0].n;
  if (!pending) {
    console.log('    ⊘ 091 skip: 0 entities pendientes de geocoding');
    return;
  }

  // 3. Cargar datasets (presentes en el repo, viajan en la imagen Docker)
  const dataDir = path.join(__dirname, '..', 'data');
  const citiesFile = path.join(dataDir, 'cities_curated.json');
  const countriesFile = path.join(dataDir, 'country_centroids.json');
  if (!fs.existsSync(citiesFile) || !fs.existsSync(countriesFile)) {
    console.log('    ⊘ 091 skip: data/cities_curated.json o country_centroids.json no encontrados');
    return;
  }

  const rawCurated = JSON.parse(fs.readFileSync(citiesFile, 'utf8'));
  delete rawCurated._comment;
  const curated = new Map();
  for (const [key, val] of Object.entries(rawCurated)) {
    const m = key.match(/^([A-Z]{2})_(.+)$/);
    if (!m) continue;
    curated.set(`${m[1]}|${normCity(m[2])}`, val);
  }
  const countries = JSON.parse(fs.readFileSync(countriesFile, 'utf8'));

  console.log(`    ✓ 091 backfilling ${pending} entities (${curated.size} curated cities, ${Object.keys(countries).length} países)`);

  // 4. Construir todas las actualizaciones en memoria
  const [rows] = await conn.query(
    `SELECT oid, city, country_code FROM entities WHERE geocoded_lat IS NULL`
  );

  const updates = [];
  let nCity = 0, nCountry = 0, nSkip = 0;
  for (const row of rows) {
    const cc = (row.country_code || '').toUpperCase();
    const key = `${cc}|${normCity(row.city)}`;
    let lat, lng, source;

    if (cc && row.city && curated.has(key)) {
      [lat, lng] = curated.get(key);
      lat += (Math.random() - 0.5) * 0.012;
      lng += (Math.random() - 0.5) * 0.012;
      source = 'city_centroid';
      nCity++;
    } else if (cc && countries[cc]) {
      [lat, lng] = countries[cc];
      lat += (Math.random() - 0.5) * 0.8;
      lng += (Math.random() - 0.5) * 0.8;
      source = 'country_centroid';
      nCountry++;
    } else {
      nSkip++;
      continue;
    }

    updates.push({
      oid: row.oid,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      source,
    });
  }

  // 5. Aplicar en batches con CASE WHEN (un round-trip por batch)
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);

    const latCase = chunk.map(() => 'WHEN ? THEN ?').join(' ');
    const lngCase = chunk.map(() => 'WHEN ? THEN ?').join(' ');
    const srcCase = chunk.map(() => 'WHEN ? THEN ?').join(' ');
    const inMarks = chunk.map(() => '?').join(',');

    const sql =
      `UPDATE entities SET ` +
      `  geocoded_lat = CASE oid ${latCase} END, ` +
      `  geocoded_lng = CASE oid ${lngCase} END, ` +
      `  geocoded_source = CASE oid ${srcCase} END, ` +
      `  geocoded_at = NOW() ` +
      `WHERE oid IN (${inMarks})`;

    const params = [];
    for (const u of chunk) params.push(u.oid, u.lat);
    for (const u of chunk) params.push(u.oid, u.lng);
    for (const u of chunk) params.push(u.oid, u.source);
    for (const u of chunk) params.push(u.oid);

    await conn.query(sql, params);
  }

  console.log(`    ✓ 091 done — city=${nCity} country=${nCountry} skip=${nSkip}`);
};
