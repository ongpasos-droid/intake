-- ═══════════════════════════════════════════════════════════════
-- Migration 006: Create routes table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS routes (
  id                  CHAR(36)      NOT NULL,
  project_id          CHAR(36)      NOT NULL,
  endpoint_a          VARCHAR(60)   NOT NULL,
  endpoint_b          VARCHAR(60)   NOT NULL,
  distance_km         INT,
  eco_travel          TINYINT(1)    NOT NULL DEFAULT 0,
  custom_rate         DECIMAL(8,2),
  distance_band       VARCHAR(20),

  PRIMARY KEY (id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  KEY idx_routes_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
