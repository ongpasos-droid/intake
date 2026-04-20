-- ═══════════════════════════════════════════════════════════════
-- Migration 004: Create partner_rates table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS partner_rates (
  id                  CHAR(36)      NOT NULL,
  partner_id          CHAR(36)      NOT NULL,
  accommodation_rate  DECIMAL(8,2)  NOT NULL,
  subsistence_rate    DECIMAL(8,2)  NOT NULL,

  PRIMARY KEY (id),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  UNIQUE KEY idx_partner_rates_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
