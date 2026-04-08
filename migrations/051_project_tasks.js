/* ── Migration 051: Project tasks ────────────────────────────────
   Stores tasks generated from activity templates per WP
   ────────────────────────────────────────────────────────────── */

module.exports = async function(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id              CHAR(36) PRIMARY KEY,
      project_id      CHAR(36) NOT NULL,
      wp_id           CHAR(36) DEFAULT NULL,
      category        VARCHAR(50) NOT NULL,
      subtype         VARCHAR(50) NOT NULL,
      title           VARCHAR(500) NOT NULL,
      description     TEXT DEFAULT NULL,
      partner_id      CHAR(36) DEFAULT NULL,
      start_month     SMALLINT DEFAULT NULL,
      end_month       SMALLINT DEFAULT NULL,
      deliverable     VARCHAR(500) DEFAULT NULL,
      milestone       VARCHAR(500) DEFAULT NULL,
      kpi             VARCHAR(500) DEFAULT NULL,
      status          ENUM('pending','in_progress','complete') DEFAULT 'pending',
      sort_order      SMALLINT DEFAULT 0,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pt_project (project_id),
      INDEX idx_pt_wp (wp_id)
    )
  `);
  console.log('  ✓ project_tasks table ready');
};
