module.exports = async function migrate064(conn) {
  // Create intake_interviews table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS intake_interviews (
      id CHAR(36) PRIMARY KEY,
      project_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      turn_index INT NOT NULL,
      role ENUM('assistant','user') NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ii_project (project_id),
      INDEX idx_ii_turns (project_id, turn_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Add interview_summary column to projects
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME = 'interview_summary'`
  );
  if (cols.length === 0) {
    await conn.query(`ALTER TABLE projects ADD COLUMN interview_summary TEXT NULL AFTER calc_state`);
  }
};
