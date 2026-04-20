// Migration 061: Add deadline_time (Brussels time) to intake_programs

module.exports = async function(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'intake_programs'`
  );
  const existing = cols.map(c => c.COLUMN_NAME);

  if (!existing.includes('deadline_time')) {
    await conn.query(`ALTER TABLE intake_programs ADD COLUMN deadline_time VARCHAR(5) DEFAULT '17:00' AFTER deadline`);
  }

  console.log('[061] intake_programs: deadline_time added (default 17:00 Brussels)');
};
