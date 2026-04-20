/* ── Migration 049: Evaluator setup ─────────────────────────────
   - Add user_id to form_instances (idempotent)
   - Create ai_parse_jobs table
   ────────────────────────────────────────────────────────────── */

async function up(pool) {
  // 1. Add user_id to form_instances if not exists
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = 'form_instances'
       AND COLUMN_NAME  = 'user_id'`
  );
  if (cols.length === 0) {
    await pool.query(`ALTER TABLE form_instances ADD COLUMN user_id CHAR(36) DEFAULT NULL AFTER id`);
    await pool.query(`CREATE INDEX idx_fi_user ON form_instances(user_id)`);
    console.log('  ✓ Added user_id to form_instances');
  }

  // 2. Create ai_parse_jobs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_parse_jobs (
      id            CHAR(36) PRIMARY KEY,
      instance_id   CHAR(36) NOT NULL,
      user_id       CHAR(36) NOT NULL,
      document_path VARCHAR(500) DEFAULT NULL,
      status        ENUM('pending','processing','complete','error') DEFAULT 'pending',
      progress_json JSON DEFAULT NULL,
      error_message TEXT DEFAULT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log('  ✓ ai_parse_jobs table ready');
}

module.exports = up;
