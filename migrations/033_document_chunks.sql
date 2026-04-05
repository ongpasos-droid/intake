-- Migration 033: Create document_chunks table for embeddings

CREATE TABLE IF NOT EXISTS document_chunks (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  document_id   VARCHAR(36) NOT NULL,
  chunk_index   INT NOT NULL,
  content       TEXT NOT NULL,
  embedding     JSON NOT NULL,
  tokens        INT DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chunks_document (document_id, chunk_index)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
