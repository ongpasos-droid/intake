module.exports = async function migrate063(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'intake_programs' AND COLUMN_NAME = 'call_summary'`
  );
  if (cols.length === 0) {
    await conn.query(`ALTER TABLE intake_programs ADD COLUMN call_summary TEXT NULL AFTER notes`);
  }
};
