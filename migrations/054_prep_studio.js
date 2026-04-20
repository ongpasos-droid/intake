module.exports = async function(conn) {
  // Table for interview Q&A responses
  const [t1] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writer_interviews'`
  );
  if (!t1.length) {
    await conn.execute(`
      CREATE TABLE writer_interviews (
        id CHAR(36) PRIMARY KEY,
        project_id CHAR(36) NOT NULL,
        user_id CHAR(36) NOT NULL,
        question_key VARCHAR(60) NOT NULL,
        question_text TEXT NOT NULL,
        answer_text TEXT,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_wi_project (project_id),
        UNIQUE KEY uq_wi_project_key (project_id, question_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  \\u2713 writer_interviews table created');
  }

  // Table for user-uploaded research documents (linked to project)
  const [t2] = await conn.execute(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'writer_research_docs'`
  );
  if (!t2.length) {
    await conn.execute(`
      CREATE TABLE writer_research_docs (
        id CHAR(36) PRIMARY KEY,
        project_id CHAR(36) NOT NULL,
        document_id INT NOT NULL,
        label VARCHAR(200),
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_wrd_project (project_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  \\u2713 writer_research_docs table created');
  }
};
