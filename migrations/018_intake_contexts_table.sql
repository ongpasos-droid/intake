-- ═══════════════════════════════════════════════════════════════
-- Migration 018: Create intake_contexts table (Intake)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS intake_contexts (
  id                  CHAR(36)      NOT NULL,
  project_id          CHAR(36)      NOT NULL,
  problem             TEXT,
  target_groups       TEXT,
  approach            TEXT,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE KEY idx_intake_ctx_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
