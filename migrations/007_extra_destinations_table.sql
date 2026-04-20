-- ═══════════════════════════════════════════════════════════════
-- Migration 007: Create extra_destinations table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS extra_destinations (
  id                  CHAR(36)      NOT NULL,
  project_id          CHAR(36)      NOT NULL,
  name                VARCHAR(100)  NOT NULL,
  country             VARCHAR(100),
  accommodation_rate  DECIMAL(8,2)  NOT NULL,
  subsistence_rate    DECIMAL(8,2)  NOT NULL,

  PRIMARY KEY (id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  KEY idx_extra_dest_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
