// Migration 064: Add national_agency to projects (where the proposal is submitted)

module.exports = async function(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects'`
  );
  const existing = cols.map(c => c.COLUMN_NAME);

  if (!existing.includes('national_agency')) {
    await conn.query(`ALTER TABLE projects ADD COLUMN national_agency VARCHAR(10) DEFAULT NULL AFTER proposal_lang`);
  }

  console.log('[064] projects: national_agency column added');
};
