-- ═══════════════════════════════════════════════════════════════
-- Migration 005: Create worker_rates table (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS worker_rates (
  id                  CHAR(36)      NOT NULL,
  partner_id          CHAR(36)      NOT NULL,
  category            VARCHAR(60)   NOT NULL,
  rate                DECIMAL(8,2)  NOT NULL,

  PRIMARY KEY (id),
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  KEY idx_worker_rates_partner (partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
