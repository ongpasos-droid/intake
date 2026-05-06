/**
 * Migration 087: Lead Beneficiary on milestones and deliverables
 * The Erasmus+ Application Form Part B requires "Lead Beneficiary"
 * on every milestone and deliverable row.
 */
module.exports = async function (conn) {
  for (const table of ['milestones', 'deliverables']) {
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    const have = new Set(cols.map(c => c.COLUMN_NAME));
    if (!have.has('lead_partner_id')) {
      await conn.execute(
        `ALTER TABLE ${table} ADD COLUMN lead_partner_id CHAR(36) DEFAULT NULL`
      );
      console.log(`  ✓ ${table}.lead_partner_id`);
    }

    // Add index (best-effort: ignore if already there)
    try {
      await conn.execute(
        `ALTER TABLE ${table} ADD INDEX idx_${table}_lead (lead_partner_id)`
      );
      console.log(`  ✓ ${table} idx_${table}_lead`);
    } catch (err) {
      if (err.code !== 'ER_DUP_KEYNAME') throw err;
    }
  }
};
