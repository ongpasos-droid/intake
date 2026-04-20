-- ═══════════════════════════════════════════════════════════════
-- Migration 008: Create work_packages table (Core)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS work_packages (
  id                  CHAR(36)      NOT NULL,
  project_id          CHAR(36)      NOT NULL,
  order_index         INT           NOT NULL,
  code                VARCHAR(10)   NOT NULL,
  title               VARCHAR(200)  NOT NULL,
  category            VARCHAR(60),
  leader_id           CHAR(36),

  PRIMARY KEY (id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (leader_id) REFERENCES partners(id) ON DELETE SET NULL,
  KEY idx_wp_project (project_id),
  KEY idx_wp_leader (leader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
