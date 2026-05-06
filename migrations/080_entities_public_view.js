/**
 * Migration 080 — Vista pública del Partner Engine.
 *
 * Crea v_entities_public (join entities + entity_enrichment + entity_classification)
 * con quality_tier calculado, y un índice FULLTEXT en (extracted_name, description).
 *
 * Es .js (no .sql) porque depende de tablas que en local no existen hasta importar
 * el dump del VPS (entities, entity_classification). En ese caso se salta sin error
 * y se vuelve a aplicar tras el import.
 */
module.exports = async function (conn) {
  const required = ['entities', 'entity_enrichment', 'entity_classification'];
  const [rows] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?,?,?)`,
    required
  );
  const present = rows.map(r => r.TABLE_NAME);
  const missing = required.filter(t => !present.includes(t));
  if (missing.length) {
    console.log(`    ⊘ 080 skip: missing tables ${missing.join(', ')} (will retry after dump import)`);
    return;
  }

  // FULLTEXT index sobre name + description (idempotente)
  try {
    await conn.query(
      `ALTER TABLE entity_enrichment ADD FULLTEXT INDEX ft_name_desc (extracted_name, description)`
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME' && e.code !== 'ER_FT_MATCHING_KEY_NOT_FOUND') throw e;
  }

  // Vista pública
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
