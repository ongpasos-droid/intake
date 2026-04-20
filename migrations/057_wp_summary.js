module.exports = async function(conn) {
  // Add summary field to work_packages for Writer context
  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_packages' AND COLUMN_NAME = 'summary'`
  );
  if (!cols.length) {
    await conn.execute(`ALTER TABLE work_packages ADD COLUMN summary TEXT DEFAULT NULL`);
    console.log('  \u2713 work_packages.summary column added');
  }
};
