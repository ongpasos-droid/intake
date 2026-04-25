/**
 * Migration 083 — Pobla stats_cache con agregados reales sobre entity_enrichment.
 *
 * Comportamiento:
 *   • Skip si faltan tablas (idem 080): se reintenta en próximo deploy
 *   • Skip si stats_cache fue refrescado hace <24h (no rehacer trabajo si está fresco)
 *   • Si vacío o stale → TRUNCATE + recompute los 6 agregados
 *
 * Como es .js, se reejecuta en cada `node scripts/migrate.js` (deploy).
 * Las 6 queries combinadas suelen tardar 1-3 segundos sobre ~165k entidades.
 */
module.exports = async function (conn) {
  const required = ['entities', 'entity_enrichment', 'entity_classification', 'stats_cache'];
  const [tableRows] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?,?,?,?)`,
    required
  );
  const present = tableRows.map(r => r.TABLE_NAME);
  const missing = required.filter(t => !present.includes(t));
  if (missing.length) {
    console.log(`    ⊘ 083 skip: missing tables ${missing.join(', ')}`);
    return;
  }

  // Freshness check — skip if cache populated <24h ago
  const [[fresh]] = await conn.query(
    `SELECT COUNT(*) AS c FROM stats_cache
     WHERE computed_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
  );
  if (fresh.c > 0) {
    console.log(`    ⊘ 083 skip: stats_cache fresh (<24h)`);
    return;
  }

  console.log(`    ▶ 083 recomputing stats_cache (esto puede tardar 1-3s)…`);
  await conn.query(`TRUNCATE stats_cache`);

  // 1) global_kpis
  await conn.query(`
    INSERT INTO stats_cache (metric_key, value)
    SELECT 'global_kpis', JSON_OBJECT(
      'total_alive',  (SELECT COUNT(*) FROM entity_enrichment WHERE archived=0),
      'with_email',   (SELECT COUNT(*) FROM entity_enrichment WHERE archived=0 AND JSON_LENGTH(emails)>0),
      'with_phone',   (SELECT COUNT(*) FROM entity_enrichment WHERE archived=0 AND JSON_LENGTH(phones)>0),
      'with_social',  (SELECT COUNT(*) FROM entity_enrichment WHERE archived=0 AND JSON_LENGTH(social_links)>0),
      'with_logo',    (SELECT COUNT(*) FROM entity_enrichment WHERE archived=0 AND logo_url IS NOT NULL),
      'countries',    (SELECT COUNT(DISTINCT country_code) FROM entities e JOIN entity_enrichment ee ON ee.oid=e.oid WHERE ee.archived=0)
    )
  `);

  // 2) by_country (top 35)
  await conn.query(`
    INSERT INTO stats_cache (metric_key, value)
    SELECT 'by_country', JSON_ARRAYAGG(JSON_OBJECT('country_code', country_code, 'count', cnt)) FROM (
      SELECT e.country_code, COUNT(*) AS cnt
      FROM entities e JOIN entity_enrichment ee ON ee.oid=e.oid
      WHERE ee.archived=0 AND e.country_code IS NOT NULL
      GROUP BY e.country_code ORDER BY cnt DESC LIMIT 35
    ) t
  `);

  // 3) by_category (top 20)
  await conn.query(`
    INSERT INTO stats_cache (metric_key, value)
    SELECT 'by_category', JSON_ARRAYAGG(JSON_OBJECT('category', category, 'count', cnt)) FROM (
      SELECT category, COUNT(*) AS cnt
      FROM entity_classification
      WHERE category IS NOT NULL
      GROUP BY category ORDER BY cnt DESC LIMIT 20
    ) t
  `);

  // 4) by_cms (top 15)
  await conn.query(`
    INSERT INTO stats_cache (metric_key, value)
    SELECT 'by_cms', JSON_ARRAYAGG(JSON_OBJECT('cms', cms_detected, 'count', cnt)) FROM (
      SELECT cms_detected, COUNT(*) AS cnt FROM entity_enrichment
      WHERE archived=0 AND cms_detected IS NOT NULL
      GROUP BY cms_detected ORDER BY cnt DESC LIMIT 15
    ) t
  `);

  // 5) by_language (top 15) — JSON array desplegado con tabla de números 0-7
  await conn.query(`
    INSERT INTO stats_cache (metric_key, value)
    SELECT 'by_language', JSON_ARRAYAGG(JSON_OBJECT('lang', lang, 'count', cnt)) FROM (
      SELECT JSON_UNQUOTE(JSON_EXTRACT(website_languages, CONCAT('$[', n.i, ']'))) AS lang, COUNT(*) AS cnt
      FROM entity_enrichment ee
      JOIN (SELECT 0 AS i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7) n
        ON n.i < JSON_LENGTH(ee.website_languages)
      WHERE ee.archived=0 AND ee.website_languages IS NOT NULL
      GROUP BY lang HAVING lang IS NOT NULL ORDER BY cnt DESC LIMIT 15
    ) t
  `);

  // 6) tier_distribution (cuenta sobre 9 indicadores)
  await conn.query(`
    INSERT INTO stats_cache (metric_key, value)
    SELECT 'tier_distribution', JSON_ARRAYAGG(JSON_OBJECT('tier', tier, 'count', cnt)) FROM (
      SELECT
        CASE
          WHEN raw>=7 THEN 'premium'
          WHEN raw>=5 THEN 'good'
          WHEN raw>=3 THEN 'acceptable'
          ELSE 'minimal'
        END AS tier,
        COUNT(*) AS cnt
      FROM (
        SELECT (
          (extracted_name IS NOT NULL) +
          (description IS NOT NULL AND CHAR_LENGTH(description) > 50) +
          (COALESCE(JSON_LENGTH(emails),0) > 0) +
          (COALESCE(JSON_LENGTH(phones),0) > 0) +
          (COALESCE(JSON_LENGTH(social_links),0) > 0) +
          (logo_url IS NOT NULL) +
          (year_founded IS NOT NULL) +
          (legal_form IS NOT NULL) +
          (COALESCE(JSON_LENGTH(website_languages),0) > 0)
        ) AS raw FROM entity_enrichment WHERE archived=0
      ) x GROUP BY tier
    ) t
  `);

  console.log(`    ✓ 083 stats_cache poblado (6 métricas)`);
};
