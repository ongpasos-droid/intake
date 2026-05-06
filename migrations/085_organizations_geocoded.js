/**
 * Migration 085 — Geocoded columns en `organizations`.
 *
 * Coords editables por el dueño de la org (vía pin draggable o navigator.geolocation).
 * Se prefieren sobre `entities.geocoded_lat/lng` cuando existen (orgs vinculadas a OID).
 *
 * source enum:
 *   - 'manual_pin'      : user arrastró el pin
 *   - 'self_geolocate'  : navigator.geolocation
 *   - 'mapbox' / 'google' / 'nominatim': geocoding lazy (futuro)
 */
module.exports = async function (conn) {
  const wanted = ['lat','lng','geocoded_source','geocoded_at'];
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizations'
       AND COLUMN_NAME IN (?,?,?,?)`,
    wanted
  );
  const have = new Set(cols.map(r => r.COLUMN_NAME));
  if (!have.has('lat'))             await conn.query(`ALTER TABLE organizations ADD COLUMN lat DECIMAL(9,6) NULL`);
  if (!have.has('lng'))             await conn.query(`ALTER TABLE organizations ADD COLUMN lng DECIMAL(9,6) NULL`);
  if (!have.has('geocoded_source')) await conn.query(`ALTER TABLE organizations ADD COLUMN geocoded_source VARCHAR(20) NULL`);
  if (!have.has('geocoded_at'))     await conn.query(`ALTER TABLE organizations ADD COLUMN geocoded_at DATETIME NULL`);

  try {
    await conn.query(`CREATE INDEX idx_organizations_geo ON organizations (lat, lng)`);
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME') throw e;
  }
};
