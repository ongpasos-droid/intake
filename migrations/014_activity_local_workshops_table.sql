-- ═══════════════════════════════════════════════════════════════
-- Migration 014: Create activity_local_workshops table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_local_workshops (
  id                  CHAR(36)      NOT NULL,
  activity_id         CHAR(36)      NOT NULL,
  partner_id          CHAR(36)      NOT NULL,
  active              TINYINT(1)    NOT NULL DEFAULT 1,
  participants        INT           NOT NULL DEFAULT 0,
  sessions            INT           NOT NULL DEFAULT 0,
  cost_per_pax        DECIMAL(8,2)  NOT NULL DEFAULT 0.00,

  PRIMARY KEY (id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  KEY idx_act_lw_activity (activity_id),
  KEY idx_act_lw_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
