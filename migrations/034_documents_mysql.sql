-- Migration 034: Documents tables in MySQL (replaces Supabase dependency)

CREATE TABLE IF NOT EXISTS documents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  owner_type    VARCHAR(20) NOT NULL,
  owner_id      VARCHAR(36) DEFAULT NULL,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  file_type     VARCHAR(100),
  file_size_bytes INT DEFAULT 0,
  storage_path  VARCHAR(500),
  tags          JSON DEFAULT ('[]'),
  status        VARCHAR(20) DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_documents_owner (owner_type, owner_id),
  INDEX idx_documents_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS document_programs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  document_id   INT NOT NULL,
  program_id    VARCHAR(36) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_doc_program (document_id, program_id),
  INDEX idx_docprog_program (program_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS project_documents (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  project_id    VARCHAR(36) NOT NULL,
  document_id   INT NOT NULL,
  source        VARCHAR(20) DEFAULT 'user',
  added_by      INT DEFAULT NULL,
  added_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_proj_doc (project_id, document_id),
  INDEX idx_projdoc_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
