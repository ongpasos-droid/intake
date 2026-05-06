/**
 * Migration 086: Work Package — fields required by Erasmus+ Application Form Part B (section 4.2)
 *  - objectives             TEXT (bullet list rendered as the "Objectives" cell of the WP table)
 *  - duration_from_month    SMALLINT (e.g. 1)
 *  - duration_to_month      SMALLINT (e.g. 24)
 */
module.exports = async function (conn) {
  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'work_packages'`
  );
  const have = new Set(cols.map(c => c.COLUMN_NAME));

  if (!have.has('objectives')) {
    await conn.execute(`ALTER TABLE work_packages ADD COLUMN objectives TEXT DEFAULT NULL`);
    console.log('  ✓ work_packages.objectives');
  }
  if (!have.has('duration_from_month')) {
    await conn.execute(`ALTER TABLE work_packages ADD COLUMN duration_from_month SMALLINT DEFAULT NULL`);
    console.log('  ✓ work_packages.duration_from_month');
  }
  if (!have.has('duration_to_month')) {
    await conn.execute(`ALTER TABLE work_packages ADD COLUMN duration_to_month SMALLINT DEFAULT NULL`);
    console.log('  ✓ work_packages.duration_to_month');
  }
};
