#!/usr/bin/env node
/**
 * ORS Error Retry — expands errored prefixes to length+1 children as `pending`.
 *
 * Rationale: the ORS API returns HTTP 500 for prefixes with too many results.
 * Rather than looping on these (PM2 restart loop), we expand them by one char
 * and let the normal crawl process the children. Called one-shot.
 *
 * Usage:
 *   node scripts/retry_errors.js            # expand all errors
 *   node scripts/retry_errors.js --dry-run  # show what would be expanded
 */
require('dotenv').config();
const pool = require('../node/src/utils/db');
const { GLOBAL_TAX_ID } = require('../node/src/modules/entities/ors_crawler');

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
const MAX_PREFIX_LENGTH = 6;

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const [errors] = await pool.execute(
    `SELECT prefix FROM ors_crawl_state
     WHERE country_tax_id = ? AND status = 'error'
     ORDER BY CHAR_LENGTH(prefix), prefix`,
    [GLOBAL_TAX_ID]
  );

  if (errors.length === 0) {
    console.log('No errors to retry.');
    await pool.end();
    return;
  }

  console.log(`Found ${errors.length} errored prefixes:`);
  const byLen = {};
  for (const { prefix } of errors) {
    byLen[prefix.length] = (byLen[prefix.length] || 0) + 1;
  }
  for (const [len, count] of Object.entries(byLen)) {
    console.log(`  length ${len}: ${count} prefixes`);
  }

  let totalChildren = 0;
  let skippedTooLong = 0;

  for (const { prefix } of errors) {
    if (prefix.length >= MAX_PREFIX_LENGTH) {
      skippedTooLong++;
      console.log(`  [${prefix}] already at max length, skipping`);
      continue;
    }

    const children = ALPHABET.map((ch) => prefix + ch);
    if (dryRun) {
      console.log(`  [${prefix}] would expand to ${children.length} children`);
      totalChildren += children.length;
      continue;
    }

    let inserted = 0;
    for (const child of children) {
      const [result] = await pool.execute(
        `INSERT IGNORE INTO ors_crawl_state (country_tax_id, prefix, status)
         VALUES (?, ?, 'pending')`,
        [GLOBAL_TAX_ID, child]
      );
      if (result.affectedRows > 0) inserted++;
    }
    totalChildren += inserted;
    console.log(`  [${prefix}] +${inserted} children queued`);
  }

  console.log('');
  console.log(`${dryRun ? 'Would queue' : 'Queued'}: ${totalChildren} new pending prefixes`);
  console.log(`Skipped (already at max length): ${skippedTooLong}`);
  console.log('');
  console.log('Next: run `node scripts/crawl_ors.js --all` to process the new pending prefixes.');

  await pool.end();
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  await pool.end();
  process.exit(1);
});
