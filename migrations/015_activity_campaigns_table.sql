-- ═══════════════════════════════════════════════════════════════
-- Migration 015: Create activity_campaigns table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_campaigns (
  id                  CHAR(36)      NOT NULL,
  activity_id         CHAR(36)      NOT NULL,
  partner_id          CHAR(36)      NOT NULL,
  active              TINYINT(1)    NOT NULL DEFAULT 1,
  monthly_amount      DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  months              INT           NOT NULL DEFAULT 0,
  cpm                 DECIMAL(8,2)  NOT NULL DEFAULT 0.00,

  PRIMARY KEY (id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  KEY idx_act_camp_activity (activity_id),
  KEY idx_act_camp_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
