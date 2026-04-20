-- ═══════════════════════════════════════════════════════════════
-- Migration 016: Create activity_generic_costs table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_generic_costs (
  id                  CHAR(36)      NOT NULL,
  activity_id         CHAR(36)      NOT NULL,
  partner_id          CHAR(36)      NOT NULL,
  active              TINYINT(1)    NOT NULL DEFAULT 1,
  note                TEXT,
  amount              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  project_pct         DECIMAL(5,2),
  lifetime_pct        DECIMAL(5,2),

  PRIMARY KEY (id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  KEY idx_act_gc_activity (activity_id),
  KEY idx_act_gc_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
