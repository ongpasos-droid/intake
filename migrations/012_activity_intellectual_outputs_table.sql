-- ═══════════════════════════════════════════════════════════════
-- Migration 012: Create activity_intellectual_outputs table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_intellectual_outputs (
  id                  CHAR(36)      NOT NULL,
  activity_id         CHAR(36)      NOT NULL,
  partner_id          CHAR(36)      NOT NULL,
  days                INT           NOT NULL,
  worker_category     VARCHAR(60),

  PRIMARY KEY (id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  KEY idx_act_io_activity (activity_id),
  KEY idx_act_io_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
