-- ═══════════════════════════════════════════════════════════════
-- Migration 017: Create intake_programs table + seed KA3 data (Intake)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS intake_programs (
  id                  CHAR(36)      NOT NULL,
  program_id          VARCHAR(60)   NOT NULL,
  name                VARCHAR(200)  NOT NULL,
  action_type         VARCHAR(60)   NOT NULL,
  deadline            DATE,
  start_date_min      DATE,
  start_date_max      DATE,
  duration_min_months INT,
  duration_max_months INT,
  eu_grant_max        DECIMAL(12,2),
  cofin_pct           INT,
  indirect_pct        DECIMAL(5,2),
  min_partners        INT           NOT NULL DEFAULT 2,
  notes               TEXT,
  active              TINYINT(1)    NOT NULL DEFAULT 1,
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_intake_programs_pid (program_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: KA3 Youth Together 2026
INSERT INTO intake_programs (
  id, program_id, name, action_type, deadline,
  start_date_min, start_date_max, duration_min_months, duration_max_months,
  eu_grant_max, cofin_pct, indirect_pct, min_partners, active
) VALUES (
  '00000000-0000-4000-a000-000000000001',
  'ka3_youth_together_2026',
  'KA3 Youth Together — European Youth Together 2026',
  'KA3-Youth',
  '2026-03-15',
  '2026-09-01',
  '2027-03-01',
  12, 24,
  500000.00, 80, 7.00, 2, 1
);
