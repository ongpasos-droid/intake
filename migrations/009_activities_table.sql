-- ═══════════════════════════════════════════════════════════════
-- Migration 009: Create activities table (Core)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activities (
  id                  CHAR(36)      NOT NULL,
  wp_id               CHAR(36)      NOT NULL,
  type                VARCHAR(20)   NOT NULL,
  label               VARCHAR(200)  NOT NULL,
  order_index         INT           NOT NULL,

  PRIMARY KEY (id),
  FOREIGN KEY (wp_id) REFERENCES work_packages(id) ON DELETE CASCADE,
  KEY idx_activities_wp (wp_id),
  KEY idx_activities_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
