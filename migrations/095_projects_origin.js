/* ── Migration 095: Add origin column to projects ────────────────
   Distinguishes projects created from scratch ('scratch') from those
   imported from a .docx evaluation that the user promoted to an
   editable project ('imported').
   Idempotent: checks COLUMNS before ALTER.
   ────────────────────────────────────────────────────────────── */

async function up(pool) {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'projects'
       AND COLUMN_NAME  = 'origin'`
  );
  if (cols.length === 0) {
    await pool.query(
      `ALTER TABLE projects
       ADD COLUMN origin ENUM('scratch','imported') NOT NULL DEFAULT 'scratch' AFTER status`
    );
    await pool.query(`CREATE INDEX idx_projects_origin ON projects(origin)`);
    console.log('  ✓ Added origin column to projects');
  }

  // Add source_evaluation_id to track promotion lineage (optional but useful)
  const [cols2] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'projects'
       AND COLUMN_NAME  = 'source_evaluation_id'`
  );
  if (cols2.length === 0) {
    await pool.query(
      `ALTER TABLE projects
       ADD COLUMN source_evaluation_id CHAR(36) DEFAULT NULL AFTER origin`
    );
    console.log('  ✓ Added source_evaluation_id to projects');
  }
}

module.exports = up;
