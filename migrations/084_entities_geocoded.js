/**
 * Migration 084 — Geocoded columns en `entities` + vista pública con coords.
 *
 * Añade lat/lng/source/at a `entities` para soportar el Atlas 3D mundial
 * y el cálculo automático de bandas km en Calculator. Idempotente y tolerante
 * a entornos locales sin la tabla `entities` aún cargada (skip silencioso).
 *
 * Camino de upgrade:
 *   - Fase 1: source='city_centroid' | 'country_centroid' (backfill bulk)
 *   - Fase 2: source='manual' (user pin drag) | 'mapbox' | 'google' (lazy)
 */
module.exports = async function (conn) {
  // 1. ¿Existe entities?
  const [t] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entities'`
  );
  if (!t.length) {
    console.log('    ⊘ 084 skip: entities table missing (will retry after dump import)');
    return;
  }

  // 2. Añadir columnas si faltan (MySQL 8 no tiene ADD COLUMN IF NOT EXISTS)
  const wanted = ['geocoded_lat','geocoded_lng','geocoded_source','geocoded_at'];
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'entities'
       AND COLUMN_NAME IN (?,?,?,?)`,
    wanted
  );
  const have = new Set(cols.map(r => r.COLUMN_NAME));
  if (!have.has('geocoded_lat'))    await conn.query(`ALTER TABLE entities ADD COLUMN geocoded_lat DECIMAL(9,6) NULL`);
  if (!have.has('geocoded_lng'))    await conn.query(`ALTER TABLE entities ADD COLUMN geocoded_lng DECIMAL(9,6) NULL`);
  if (!have.has('geocoded_source')) await conn.query(`ALTER TABLE entities ADD COLUMN geocoded_source VARCHAR(20) NULL`);
  if (!have.has('geocoded_at'))     await conn.query(`ALTER TABLE entities ADD COLUMN geocoded_at DATETIME NULL`);

  // 3. Índice para queries del globo (filtro WHERE geocoded_lat IS NOT NULL)
  try {
    await conn.query(`CREATE INDEX idx_entities_geo ON entities (geocoded_lat, geocoded_lng)`);
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME') throw e;
  }

  // 4. Rebuild v_entities_public si las dependencias existen
  const [deps] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('entity_enrichment','entity_classification')`
  );
  if (deps.length < 2) {
    console.log('    ⊘ 084 view skip: enrichment/classification missing');
    return;
  }

  await conn.query(`DROP VIEW IF EXISTS v_entities_public`);
  await conn.query(`
    CREATE VIEW v_entities_public AS
    SELECT
      e.oid,
      COALESCE(NULLIF(ee.extracted_name, ''), e.legal_name) AS display_name,
      e.legal_name,
      e.country_code,
      e.city,
      e.website,
      e.vat,
      e.validity_label,
      e.geocoded_lat,
      e.geocoded_lng,
      e.geocoded_source,
      ec.category,
      ec.confidence AS category_confidence,
      ee.description,
      ee.legal_form,
      ee.year_founded,
      ee.emails,
      ee.phones,
      ee.social_links,
      ee.website_languages,
      ee.cms_detected,
      ee.logo_url,
      ee.eu_programs,
      ee.has_erasmus_accreditation,
      ee.students_count,
      ee.score_professionalism,
      ee.score_eu_readiness,
      ee.score_vitality,
      (
        (ee.extracted_name IS NOT NULL) +
        (ee.description IS NOT NULL AND CHAR_LENGTH(ee.description) > 50) +
        (COALESCE(JSON_LENGTH(ee.emails), 0) > 0) +
        (COALESCE(JSON_LENGTH(ee.phones), 0) > 0) +
        (COALESCE(JSON_LENGTH(ee.social_links), 0) > 0) +
        (ee.logo_url IS NOT NULL) +
        (ee.year_founded IS NOT NULL) +
        (ee.legal_form IS NOT NULL) +
        (COALESCE(JSON_LENGTH(ee.website_languages), 0) > 0)
      ) AS quality_score_raw,
      CASE
        WHEN (
          (ee.extracted_name IS NOT NULL) +
          (ee.description IS NOT NULL AND CHAR_LENGTH(ee.description) > 50) +
          (COALESCE(JSON_LENGTH(ee.emails), 0) > 0) +
          (COALESCE(JSON_LENGTH(ee.phones), 0) > 0) +
          (COALESCE(JSON_LENGTH(ee.social_links), 0) > 0) +
          (ee.logo_url IS NOT NULL) +
          (ee.year_founded IS NOT NULL) +
          (ee.legal_form IS NOT NULL) +
          (COALESCE(JSON_LENGTH(ee.website_languages), 0) > 0)
        ) >= 7 THEN 'premium'
        WHEN (
          (ee.extracted_name IS NOT NULL) +
          (ee.description IS NOT NULL AND CHAR_LENGTH(ee.description) > 50) +
          (COALESCE(JSON_LENGTH(ee.emails), 0) > 0) +
          (COALESCE(JSON_LENGTH(ee.phones), 0) > 0) +
          (COALESCE(JSON_LENGTH(ee.social_links), 0) > 0) +
          (ee.logo_url IS NOT NULL) +
          (ee.year_founded IS NOT NULL) +
          (ee.legal_form IS NOT NULL) +
          (COALESCE(JSON_LENGTH(ee.website_languages), 0) > 0)
        ) >= 5 THEN 'good'
        WHEN (
          (ee.extracted_name IS NOT NULL) +
          (ee.description IS NOT NULL AND CHAR_LENGTH(ee.description) > 50) +
          (COALESCE(JSON_LENGTH(ee.emails), 0) > 0) +
          (COALESCE(JSON_LENGTH(ee.phones), 0) > 0) +
          (COALESCE(JSON_LENGTH(ee.social_links), 0) > 0) +
          (ee.logo_url IS NOT NULL) +
          (ee.year_founded IS NOT NULL) +
          (ee.legal_form IS NOT NULL) +
          (COALESCE(JSON_LENGTH(ee.website_languages), 0) > 0)
        ) >= 3 THEN 'acceptable'
        ELSE 'minimal'
      END AS quality_tier,
      ee.last_fetched_at
    FROM entities e
    JOIN entity_enrichment ee ON ee.oid = e.oid AND ee.archived = 0
    LEFT JOIN entity_classification ec ON ec.oid = e.oid
  `);
};
