// Migration 062: Add proposal_lang to projects (language the proposal will be written in)

module.exports = async function(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects'`
  );
  const existing = cols.map(c => c.COLUMN_NAME);

  if (!existing.includes('proposal_lang')) {
    await conn.query(`ALTER TABLE projects ADD COLUMN proposal_lang VARCHAR(5) DEFAULT 'en' AFTER description`);
  }

  console.log('[062] projects: proposal_lang column added (default en)');
};
