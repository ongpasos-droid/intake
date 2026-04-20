-- ═══════════════════════════════════════════════════════════════
-- Migration 010: Create activity_mobility + participants tables (Calculator)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activity_mobility (
  id                  CHAR(36)      NOT NULL,
  activity_id         CHAR(36)      NOT NULL,
  host_partner_id     CHAR(36)      NOT NULL,
  host_active         TINYINT(1)    NOT NULL DEFAULT 1,
  pax_per_partner     INT           NOT NULL,
  duration_days       INT           NOT NULL,
  local_pax           INT           NOT NULL DEFAULT 0,
  local_transport     DECIMAL(8,2)  NOT NULL DEFAULT 0.00,
  mat_cost_per_pax    DECIMAL(8,2)  NOT NULL DEFAULT 0.00,

  PRIMARY KEY (id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (host_partner_id) REFERENCES partners(id) ON DELETE CASCADE,
  UNIQUE KEY idx_act_mob_activity (activity_id),
  KEY idx_act_mob_host (host_partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_mobility_participants (
  activity_id         CHAR(36)      NOT NULL,
  partner_id          CHAR(36)      NOT NULL,
  active              TINYINT(1)    NOT NULL DEFAULT 1,

  PRIMARY KEY (activity_id, partner_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
