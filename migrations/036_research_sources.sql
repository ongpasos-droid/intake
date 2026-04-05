-- Research sources and project-source links
-- Idempotent: safe to re-run

CREATE TABLE IF NOT EXISTS research_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(500),
  source_api VARCHAR(50) DEFAULT 'openalex',
  title VARCHAR(500) NOT NULL,
  authors JSON,
  publication_year INT,
  abstract TEXT,
  url VARCHAR(1000),
  pdf_url VARCHAR(1000),
  language VARCHAR(10),
  country_focus VARCHAR(10),
  topics JSON,
  citation_count INT DEFAULT 0,
  is_open_access TINYINT(1) DEFAULT 0,
  full_text LONGTEXT,
  status ENUM('reference','downloaded','extracted','vectorized','error') DEFAULT 'reference',
  file_path VARCHAR(500),
  added_by VARCHAR(36),
  visibility ENUM('public','private') DEFAULT 'public',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_external_source (external_id, source_api)
);

CREATE TABLE IF NOT EXISTS project_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  source_id INT NOT NULL,
  axis VARCHAR(100),
  country_context VARCHAR(10),
  relevance_notes TEXT,
  added_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_project_source (project_id, source_id)
);
