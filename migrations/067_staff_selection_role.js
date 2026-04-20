module.exports = async function(conn) {
  // Add 'selected' boolean and 'project_role' to project_partner_staff
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project_partner_staff' AND COLUMN_NAME = 'selected'`
  );
  if (!cols.length) {
    await conn.query(`ALTER TABLE project_partner_staff ADD COLUMN selected TINYINT(1) NOT NULL DEFAULT 0 AFTER staff_id`);
    await conn.query(`ALTER TABLE project_partner_staff ADD COLUMN project_role VARCHAR(150) DEFAULT NULL AFTER selected`);
    console.log('[067] project_partner_staff: selected + project_role added');
  }
};
