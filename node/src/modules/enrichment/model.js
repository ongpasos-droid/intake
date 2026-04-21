/**
 * model.js — DB layer for entity_enrichment.
 *
 * Upsert semantics: one row per oid. Re-running on the same oid overwrites
 * (but increments fetch_attempts and preserves first_fetched_at).
 */

const pool = require('../../utils/db');

const UPSERT_COLUMNS = [
  'oid',
  'first_fetched_at', 'last_fetched_at', 'fetch_attempts',
  'error_type', 'error_message', 'http_status_final',
  'redirect_chain', 'final_url', 'ssl_valid', 'content_hash',
  'extracted_name', 'description', 'parent_organization',
  'legal_form', 'year_founded',
  'vat_number', 'tax_id_national', 'oid_erasmus_on_site', 'pic_on_site',
  'emails', 'phones', 'addresses',
  'website_languages', 'social_links', 'cms_detected',
  'copyright_year', 'last_news_date', 'logo_url', 'sitemap_lastmod',
  'staff_names', 'network_memberships',
  'eu_programs', 'has_erasmus_accreditation', 'has_etwinning_label',
  'students_count', 'teachers_count', 'employees_count', 'num_locations',
  'has_donate_button', 'has_newsletter_signup', 'has_privacy_policy',
  'score_professionalism', 'score_eu_readiness', 'score_vitality', 'score_squat_risk',
  'mismatch_level',
  'name_matches_domain', 'likely_squatted', 'likely_wrong_entity_type',
];

const JSON_FIELDS = new Set([
  'redirect_chain', 'emails', 'phones', 'addresses',
  'website_languages', 'social_links', 'staff_names',
  'network_memberships', 'eu_programs',
]);

/**
 * Upsert a row. Input is a plain object with some subset of columns.
 * Missing columns are left at their DB default.
 */
async function upsertEnrichment(row) {
  const now = new Date();
  row.oid = row.oid || null;
  if (!row.oid) throw new Error('oid is required');
  row.last_fetched_at = now;

  const cols = UPSERT_COLUMNS;
  const values = cols.map((c) => {
    if (!(c in row)) return undefined;
    let v = row[c];
    if (JSON_FIELDS.has(c) && v !== null && v !== undefined) v = JSON.stringify(v);
    return v;
  });

  // Build INSERT ... ON DUPLICATE KEY UPDATE
  const usedCols = [];
  const placeholders = [];
  const params = [];
  for (let i = 0; i < cols.length; i++) {
    if (values[i] === undefined) continue;
    usedCols.push(cols[i]);
    placeholders.push('?');
    params.push(values[i] ?? null);
  }

  // Preserve first_fetched_at on update (only set if NULL)
  const updateAssigns = usedCols
    .filter((c) => c !== 'oid' && c !== 'first_fetched_at')
    .map((c) => `${c} = VALUES(${c})`);
  updateAssigns.push('first_fetched_at = COALESCE(first_fetched_at, VALUES(first_fetched_at))');
  updateAssigns.push('fetch_attempts = fetch_attempts + 1');

  const sql = `
    INSERT INTO entity_enrichment (${usedCols.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON DUPLICATE KEY UPDATE ${updateAssigns.join(', ')}
  `;
  await pool.query(sql, params);
}

/**
 * Return OIDs that should be skipped because they were fetched recently.
 * maxAgeDays: skip if last_fetched_at within this window.
 */
async function getAlreadyFetchedOids(oids, maxAgeDays = 30) {
  if (!oids || oids.length === 0) return new Set();
  const [rows] = await pool.query(
    `SELECT oid FROM entity_enrichment
     WHERE oid IN (?) AND last_fetched_at > DATE_SUB(NOW(), INTERVAL ? DAY)`,
    [oids, maxAgeDays],
  );
  return new Set(rows.map((r) => r.oid));
}

async function close() {
  await pool.end();
}

module.exports = { upsertEnrichment, getAlreadyFetchedOids, close };
