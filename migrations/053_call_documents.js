module.exports = async function migrate053(conn) {
  const [tables] = await conn.query("SHOW TABLES LIKE 'call_documents'");
  if (tables.length) return;

  await conn.query(`
    CREATE TABLE call_documents (
      id          CHAR(36)     NOT NULL,
      program_id  CHAR(36)     NOT NULL,
      document_id INT          NOT NULL,
      doc_type    ENUM('programme_guide','call_document','annex','template','faq','other') DEFAULT 'other',
      label       VARCHAR(200),
      sort_order  INT DEFAULT 0,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      FOREIGN KEY (program_id)  REFERENCES intake_programs(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id)       ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};
