const pool = require('../node/src/utils/db');

module.exports = async function migrate053() {
  const conn = await pool.getConnection();
  try {
    // Check if table already exists
    const [tables] = await conn.query("SHOW TABLES LIKE 'call_documents'");
    if (tables.length) { conn.release(); return; }

    await conn.query(`
      CREATE TABLE call_documents (
        id          CHAR(36) PRIMARY KEY,
        program_id  CHAR(36) NOT NULL,
        document_id INT NOT NULL,
        doc_type    ENUM('programme_guide','call_document','annex','template','faq','other') DEFAULT 'other',
        label       VARCHAR(200),
        sort_order  INT DEFAULT 0,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (program_id)  REFERENCES intake_programs(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id)       ON DELETE CASCADE
      )
    `);
    console.log('  ✓ 053: call_documents table created');
  } finally { conn.release(); }
};
