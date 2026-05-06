-- ═══════════════════════════════════════════════════════════════
-- Migration 079: Deliverables (per work package)
-- ═══════════════════════════════════════════════════════════════
-- Concrete outputs a WP must produce (reports, toolkits, software,
-- events, datasets). Used by Writer Phase 2 as a structured table
-- per WP in section 4.2 of Part B.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deliverables (
  id                   CHAR(36)      NOT NULL,
  work_package_id      CHAR(36)      NOT NULL,
  project_id           CHAR(36)      NOT NULL,
  code                 VARCHAR(20)   DEFAULT NULL,
  title                VARCHAR(255)  NOT NULL,
  description          TEXT          DEFAULT NULL,
  type                 VARCHAR(60)   DEFAULT NULL,
  dissemination_level  VARCHAR(20)   DEFAULT NULL,
  due_month            SMALLINT      DEFAULT NULL,
  sort_order           INT           NOT NULL DEFAULT 0,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_deliverable_wp      (work_package_id),
  KEY idx_deliverable_project (project_id),
  CONSTRAINT fk_deliverable_wp      FOREIGN KEY (work_package_id) REFERENCES work_packages(id) ON DELETE CASCADE,
  CONSTRAINT fk_deliverable_project FOREIGN KEY (project_id)      REFERENCES projects(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
