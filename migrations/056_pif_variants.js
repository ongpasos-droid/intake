module.exports = async function(conn) {
  // ── org_pif_variants: reusable PIF adaptations per organization ──
  const [t1] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'org_pif_variants'`
  );
  if (!t1.length) {
    await conn.execute(`
      CREATE TABLE org_pif_variants (
        id               CHAR(36) PRIMARY KEY,
        organization_id  CHAR(36) NOT NULL,
        category         VARCHAR(60) NOT NULL,
        category_label   VARCHAR(120) DEFAULT NULL,
        adapted_text     LONGTEXT NOT NULL,
        source           ENUM('ai','manual') NOT NULL DEFAULT 'ai',
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        UNIQUE KEY uq_org_pif_cat (organization_id, category),
        INDEX idx_opv_org (organization_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  \u2713 org_pif_variants table created');
  }

  // ── project_partner_pifs: which variant each partner uses in each project ──
  const [t2] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_partner_pifs'`
  );
  if (!t2.length) {
    await conn.execute(`
      CREATE TABLE project_partner_pifs (
        id               CHAR(36) PRIMARY KEY,
        project_id       CHAR(36) NOT NULL,
        partner_id       CHAR(36) NOT NULL,
        variant_id       CHAR(36) DEFAULT NULL,
        custom_text      LONGTEXT DEFAULT NULL,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES org_pif_variants(id) ON DELETE SET NULL,
        UNIQUE KEY uq_project_partner_pif (project_id, partner_id),
        INDEX idx_ppp_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  \u2713 project_partner_pifs table created');
  }

  // ── Add tab column to writer_interviews for distributing questions across tabs ──
  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writer_interviews' AND COLUMN_NAME = 'tab'`
  );
  if (!cols.length) {
    await conn.execute(
      `ALTER TABLE writer_interviews ADD COLUMN tab VARCHAR(20) DEFAULT NULL`
    );
    console.log('  \u2713 writer_interviews.tab column added');
  }
};
