-- ═══════════════════════════════════════════════════════════════
-- Migration 078: Milestones (per work package)
-- ═══════════════════════════════════════════════════════════════
-- Concrete, verifiable checkpoints inside a WP. Used by Writer
-- Phase 2 as a structured table per WP in section 4.2 of Part B.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS milestones (
  id               CHAR(36)      NOT NULL,
  work_package_id  CHAR(36)      NOT NULL,
  project_id       CHAR(36)      NOT NULL,
  code             VARCHAR(20)   DEFAULT NULL,
  title            VARCHAR(255)  NOT NULL,
  description      TEXT          DEFAULT NULL,
  due_month        SMALLINT      DEFAULT NULL,
  verification     TEXT          DEFAULT NULL,
  sort_order       INT           NOT NULL DEFAULT 0,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_milestone_wp      (work_package_id),
  KEY idx_milestone_project (project_id),
  CONSTRAINT fk_milestone_wp      FOREIGN KEY (work_package_id) REFERENCES work_packages(id) ON DELETE CASCADE,
  CONSTRAINT fk_milestone_project FOREIGN KEY (project_id)      REFERENCES projects(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
