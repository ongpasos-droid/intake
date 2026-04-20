module.exports = async function(conn) {
  // Add organization_id FK to partners table (nullable — not all partners are linked)
  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'partners' AND COLUMN_NAME = 'organization_id'`
  );
  if (!cols.length) {
    await conn.execute(`ALTER TABLE partners ADD COLUMN organization_id CHAR(36) DEFAULT NULL`);
    await conn.execute(
      `ALTER TABLE partners ADD CONSTRAINT fk_partner_org
       FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL`
    );
    console.log('  \u2713 partners.organization_id FK added');
  }
};
