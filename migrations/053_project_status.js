module.exports = async function(conn) {
  // Change status column to VARCHAR to support design/writing/evaluating values
  const [cols] = await conn.execute(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'status'`
  );
  if (cols.length && cols[0].COLUMN_TYPE.includes('enum')) {
    await conn.execute(`ALTER TABLE projects MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'design'`);
    await conn.execute(`UPDATE projects SET status = 'design' WHERE status IN ('draft', '')`);
    console.log('  \u2713 projects.status changed from ENUM to VARCHAR');
  } else if (!cols.length) {
    await conn.execute(`ALTER TABLE projects ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'design' AFTER user_id`);
    console.log('  \u2713 projects.status added');
  }
};
