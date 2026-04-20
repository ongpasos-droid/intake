/* ── Migration 050: Budget tables (Lump Sum II structure) ────────
   Mirrors the EACEA Detailed Budget Excel structure:
   - budget_projects: top-level config (max grant, co-fin %, indirect %)
   - budget_beneficiaries: list of partners (BE 001, BE 002...)
   - budget_work_packages: list of WPs
   - budget_costs: line items per beneficiary × WP × category
   ────────────────────────────────────────────────────────────── */

module.exports = async function(pool) {

  // 1. Budget projects
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_projects (
      id              CHAR(36) PRIMARY KEY,
      user_id         CHAR(36) NOT NULL,
      project_id      CHAR(36) DEFAULT NULL,
      program_id      CHAR(36) DEFAULT NULL,
      name            VARCHAR(300) DEFAULT NULL,
      max_grant       DECIMAL(12,2) DEFAULT 0,
      cofin_pct       DECIMAL(5,2) DEFAULT 80,
      indirect_pct    DECIMAL(5,2) DEFAULT 7,
      status          ENUM('draft','complete') DEFAULT 'draft',
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_bp_user (user_id)
    )
  `);
  console.log('  ✓ budget_projects table ready');

  // 2. Budget beneficiaries
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_beneficiaries (
      id              CHAR(36) PRIMARY KEY,
      budget_id       CHAR(36) NOT NULL,
      number          SMALLINT NOT NULL DEFAULT 1,
      name            VARCHAR(300) DEFAULT '',
      acronym         VARCHAR(50) DEFAULT '',
      country         VARCHAR(100) DEFAULT '',
      is_coordinator  TINYINT(1) DEFAULT 0,
      sort_order      SMALLINT DEFAULT 0,
      FOREIGN KEY (budget_id) REFERENCES budget_projects(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✓ budget_beneficiaries table ready');

  // 3. Budget work packages
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_work_packages (
      id              CHAR(36) PRIMARY KEY,
      budget_id       CHAR(36) NOT NULL,
      number          SMALLINT NOT NULL DEFAULT 1,
      label           VARCHAR(300) DEFAULT '',
      sort_order      SMALLINT DEFAULT 0,
      FOREIGN KEY (budget_id) REFERENCES budget_projects(id) ON DELETE CASCADE
    )
  `);
  console.log('  ✓ budget_work_packages table ready');

  // 4. Budget cost lines — one row per beneficiary × WP × line item
  // category: A, B, C, D
  // subcategory: A1, A2, A3, A4, A5, C1, C2, C3, D1
  // line_item: the specific row (coordinator, trainer, travel, accommodation, etc.)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budget_costs (
      id              CHAR(36) PRIMARY KEY,
      budget_id       CHAR(36) NOT NULL,
      beneficiary_id  CHAR(36) NOT NULL,
      wp_id           CHAR(36) NOT NULL,
      category        CHAR(1) NOT NULL COMMENT 'A,B,C,D',
      subcategory     VARCHAR(10) DEFAULT NULL COMMENT 'A1,A2,A3,A4,A5,C1,C2,C3,D1',
      line_item       VARCHAR(100) NOT NULL,
      units           DECIMAL(10,2) DEFAULT 0,
      cost_per_unit   DECIMAL(12,2) DEFAULT 0,
      total_cost      DECIMAL(12,2) DEFAULT 0,
      notes           TEXT DEFAULT NULL,
      FOREIGN KEY (budget_id) REFERENCES budget_projects(id) ON DELETE CASCADE,
      FOREIGN KEY (beneficiary_id) REFERENCES budget_beneficiaries(id) ON DELETE CASCADE,
      FOREIGN KEY (wp_id) REFERENCES budget_work_packages(id) ON DELETE CASCADE,
      INDEX idx_bc_bwp (budget_id, beneficiary_id, wp_id)
    )
  `);
  console.log('  ✓ budget_costs table ready');
};
