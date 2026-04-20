-- NOTA: Renombrada de 002 a 002b para evitar colisión con 002_intake_tables.sql
-- ═══════════════════════════════════════════════════════════════
-- Migration 002: Create projects table (Core)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS projects (
  id                  CHAR(36)      NOT NULL,
  user_id             CHAR(36)      NOT NULL,
  name                VARCHAR(100)  NOT NULL,
  type                VARCHAR(60)   NOT NULL,
  description         TEXT,
  start_date          DATE          NOT NULL,
  duration_months     INT           NOT NULL,
  deadline            DATE,
  eu_grant            DECIMAL(12,2) NOT NULL,
  cofin_pct           INT           NOT NULL,
  indirect_pct        DECIMAL(5,2)  NOT NULL,
  status              ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_projects_user (user_id),
  KEY idx_projects_status (status),
  KEY idx_projects_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
