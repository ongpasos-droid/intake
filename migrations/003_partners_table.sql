-- ═══════════════════════════════════════════════════════════════
-- Migration 003: Create partners table (Core)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS partners (
  id                  CHAR(36)      NOT NULL,
  project_id          CHAR(36)      NOT NULL,
  name                VARCHAR(100)  NOT NULL,
  legal_name          VARCHAR(200),
  city                VARCHAR(100),
  country             VARCHAR(100)  NOT NULL,
  role                ENUM('applicant','partner') NOT NULL,
  order_index         INT           NOT NULL,

  PRIMARY KEY (id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  KEY idx_partners_project (project_id),
  KEY idx_partners_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
