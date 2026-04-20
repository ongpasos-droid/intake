/**
 * ORS Crawler — iterative deepening with checkpoint/resume.
 * Spec: docs/ORS_CRAWL_SPEC.md §4
 */
const pool = require('../../utils/db');
const ors = require('./ors_client');

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
const MIN_PREFIX_LENGTH = 2; // ORS API returns 500 for single-char prefixes

// Validity type mapping
const VALIDITY_MAP = {
  '42284353': 'certified',
  '42284356': 'waiting',
};

/**
 * Resolve ISO country code from taxonomy ID using cached country list.
 * @param {Array} countries - from ors.getCountries()
 * @param {string} taxId
 * @returns {string|null} ISO 2-letter code
 */
function resolveCountryISO(countries, taxId) {
  if (!taxId || !countries) return null;
  const entry = countries[taxId];
  return entry ? (entry.code || null) : null;
}

/**
 * Build ISO lookup map from country taxonomy.
 * ORS returns an object with taxId keys, each value has { id, code, ... }
 * @param {Object} countries - raw response from GET /configuration/countries
 * @returns {Map<string, string>} taxId -> ISO code
 */
function buildCountryMap(countries) {
  const map = new Map();
  const entries = Array.isArray(countries) ? countries : Object.values(countries);
  for (const c of entries) {
    if (c.id && c.code) {
      map.set(String(c.id), c.code);
    }
  }
  return map;
}

/**
 * Build reverse lookup: ISO -> taxonomy ID.
 * @param {Object} countries - raw response from GET /configuration/countries
 * @returns {Map<string, string>} ISO code -> taxId
 */
function buildISOToTaxMap(countries) {
  const map = new Map();
  const entries = Array.isArray(countries) ? countries : Object.values(countries);
  for (const c of entries) {
    if (c.id && c.code) {
      map.set(c.code.toUpperCase(), String(c.id));
    }
  }
  return map;
}

/**
 * Upsert a single entity from ORS API response into the DB.
 */
async function upsertEntity(raw, countryISO, countryTaxId) {
  const oid = (raw.organisationId || '').trim();
  if (!oid) return;

  const legalName = (raw.legalName || '').trim();
  if (!legalName) return;

  const validityLabel = VALIDITY_MAP[raw.validityType] || (raw.validityType ? 'unknown' : null);

  await pool.execute(
    `INSERT INTO entities (oid, pic, legal_name, business_name, country_code, country_tax_id,
       city, website, website_show, vat, registration_no, validity_type, validity_label,
       go_to_link, source, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ors_api', ?)
     ON DUPLICATE KEY UPDATE
       pic = VALUES(pic),
       legal_name = VALUES(legal_name),
       business_name = VALUES(business_name),
       country_code = VALUES(country_code),
       country_tax_id = VALUES(country_tax_id),
       city = VALUES(city),
       website = VALUES(website),
       website_show = VALUES(website_show),
       vat = VALUES(vat),
       registration_no = VALUES(registration_no),
       validity_type = VALUES(validity_type),
       validity_label = VALUES(validity_label),
       go_to_link = VALUES(go_to_link),
       raw_json = VALUES(raw_json),
       last_seen_at = NOW()`,
    [
      oid,
      (raw.pic || '').trim() || null,
      legalName,
      (raw.businessName || '').trim() || null,
      countryISO || null,
      countryTaxId || null,
      (raw.city || '').trim() || null,
      (raw.website || '').trim() || null,
      (raw.websiteShow || '').trim() || null,
      (raw.vat || '').trim() || null,
      (raw.registration || '').trim() || null,
      (raw.validityType || '').trim() || null,
      validityLabel,
      (raw.goTolink || '').trim() || null,
      JSON.stringify(raw),
    ]
  );
}

/**
 * Check if a prefix is already completed (done) in crawl state.
 */
async function isPrefixDone(countryTaxId, prefix) {
  const [rows] = await pool.execute(
    `SELECT status FROM ors_crawl_state WHERE country_tax_id = ? AND prefix = ?`,
    [countryTaxId, prefix]
  );
  return rows.length > 0 && rows[0].status === 'done';
}

/**
 * Mark a prefix as in_progress.
 */
async function markInProgress(countryTaxId, prefix) {
  await pool.execute(
    `INSERT INTO ors_crawl_state (country_tax_id, prefix, status, started_at)
     VALUES (?, ?, 'in_progress', NOW())
     ON DUPLICATE KEY UPDATE status = 'in_progress', started_at = NOW(), error_message = NULL`,
    [countryTaxId, prefix]
  );
}

/**
 * Mark a prefix as done with result count.
 */
async function markDone(countryTaxId, prefix, resultCount) {
  await pool.execute(
    `UPDATE ors_crawl_state SET status = 'done', result_count = ?, finished_at = NOW()
     WHERE country_tax_id = ? AND prefix = ?`,
    [resultCount, countryTaxId, prefix]
  );
}

/**
 * Mark a prefix as capped (200 results, needs deepening).
 */
async function markCapped(countryTaxId, prefix, resultCount) {
  await pool.execute(
    `UPDATE ors_crawl_state SET status = 'capped', result_count = ?, finished_at = NOW()
     WHERE country_tax_id = ? AND prefix = ?`,
    [resultCount, countryTaxId, prefix]
  );
}

/**
 * Mark a prefix as error.
 */
async function markError(countryTaxId, prefix, errorMessage) {
  await pool.execute(
    `UPDATE ors_crawl_state SET status = 'error', error_message = ?, finished_at = NOW()
     WHERE country_tax_id = ? AND prefix = ?`,
    [errorMessage.slice(0, 500), countryTaxId, prefix]
  );
}

/**
 * Crawl all entities for a given country.
 * @param {string} countryTaxId - ORS taxonomy ID for the country
 * @param {string} countryISO - ISO 2-letter code
 * @param {Object} options - { dryRun, maxPrefixes, onProgress }
 */
async function crawlCountry(countryTaxId, countryISO, options = {}) {
  const { dryRun = false, maxPrefixes = Infinity, onProgress = null } = options;

  // Build initial 2-letter prefixes (API returns 500 for single chars)
  const queue = [];
  for (const a of ALPHABET) {
    for (const b of ALPHABET) {
      queue.push(a + b);
    }
  }
  let processedCount = 0;
  let totalEntities = 0;
  let cappedPrefixes = 0;

  console.log(`[crawler] Starting crawl for ${countryISO} (taxId: ${countryTaxId})`);
  if (dryRun) console.log('[crawler] DRY RUN mode — limited prefixes');

  while (queue.length > 0) {
    if (processedCount >= maxPrefixes) {
      console.log(`[crawler] Max prefixes (${maxPrefixes}) reached, stopping.`);
      break;
    }

    const prefix = queue.shift();

    // Skip if already done
    if (await isPrefixDone(countryTaxId, prefix)) {
      console.log(`  [${prefix}] already done, skipping`);
      continue;
    }

    await markInProgress(countryTaxId, prefix);

    try {
      const { results, cappedAtLimit, durationMs, httpStatus } = await ors.advancedSearch({
        country: countryTaxId,
        legalName: prefix,
      });

      // Log the request
      await ors.logRequest(countryTaxId, prefix, httpStatus, results.length, durationMs, null);

      // Upsert all entities
      for (const r of results) {
        await upsertEntity(r, countryISO, countryTaxId);
      }
      totalEntities += results.length;

      if (cappedAtLimit) {
        // Add deeper prefixes to queue
        for (const letter of ALPHABET) {
          queue.push(prefix + letter);
        }
        await markCapped(countryTaxId, prefix, results.length);
        cappedPrefixes++;
        console.log(`  [${prefix}] ${results.length} results (CAPPED) — expanding, ${durationMs}ms`);
      } else {
        await markDone(countryTaxId, prefix, results.length);
        console.log(`  [${prefix}] ${results.length} results, ${durationMs}ms`);
      }

      processedCount++;

      // Progress callback
      if (onProgress) {
        try {
          await onProgress({ processedCount, totalEntities, cappedPrefixes, queueLength: queue.length });
        } catch (_) { /* don't let report errors stop the crawl */ }
      }
    } catch (err) {
      console.error(`  [${prefix}] ERROR: ${err.message}`);
      await markError(countryTaxId, prefix, err.message);
      await ors.logRequest(countryTaxId, prefix, null, null, null, err.message);
      processedCount++;
    }
  }

  console.log(`[crawler] Done: ${processedCount} prefixes processed, ${totalEntities} entities upserted, ${cappedPrefixes} capped`);
  return { processedCount, totalEntities, cappedPrefixes, remaining: queue.length };
}

/**
 * Get crawl progress for a country.
 */
async function getProgress(countryTaxId) {
  const [rows] = await pool.execute(
    `SELECT
       COUNT(*) AS total_prefixes,
       SUM(status='done') AS done,
       SUM(status='capped') AS capped,
       SUM(status='in_progress') AS in_progress,
       SUM(status='error') AS errors,
       SUM(status='pending') AS pending
     FROM ors_crawl_state
     WHERE country_tax_id = ?`,
    [countryTaxId]
  );
  return rows[0];
}

module.exports = {
  crawlCountry,
  getProgress,
  buildCountryMap,
  buildISOToTaxMap,
  upsertEntity,
};
