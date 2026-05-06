/**
 * Migration 090: auto_generated flag on deliverables and milestones.
 * Lets the smart-merge auto-distribute preserve manually-edited rows
 * while replacing only the rows that are still auto-generated boilerplate.
 *
 * Default = 0 (treat existing rows as manual / preserved).
 * Auto-distribute and auto-generate set new rows to 1.
 * Any PATCH to a content field flips it back to 0.
 */
module.exports = async function (conn) {
  for (const table of ['deliverables', 'milestones']) {
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    const have = new Set(cols.map(c => c.COLUMN_NAME));
    if (!have.has('auto_generated')) {
      await conn.execute(
        `ALTER TABLE ${table} ADD COLUMN auto_generated TINYINT(1) NOT NULL DEFAULT 0`
      );
      console.log(`  ✓ ${table}.auto_generated`);
    }
  }
};
