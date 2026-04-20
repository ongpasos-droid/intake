-- ═══════════════════════════════════════════════════════════════
-- Migration 013: Create activity_multiplier_events table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_multiplier_events (
  id                  CHAR(36)      NOT NULL,
  activity_id         CHAR(36)      NOT NULL,
  partner_id          CHAR(36)      NOT NULL,
  active              TINYINT(1)    NOT NULL DEFAULT 1,
  local_pax           INT           NOT NULL DEFAULT 0,
  intl_pax            INT           NOT NULL DEFAULT 0,
  local_rate          DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  intl_rate           DECIMAL(8,2)  NOT NULL DEFAULT 0.00,

  PRIMARY KEY (id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  KEY idx_act_me_activity (activity_id),
  KEY idx_act_me_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
