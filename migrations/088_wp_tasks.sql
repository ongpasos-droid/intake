-- ═══════════════════════════════════════════════════════════════
-- Migration 088: WP Tasks (Activities and division of work)
-- ═══════════════════════════════════════════════════════════════
-- Maps to the "Activities and division of work (WP description)"
-- table of the Erasmus+ Application Form Part B (section 4.2).
-- Form columns:
--   Task No (T{wp}.{n})       → code
--   Task Name                 → title
--   Description               → description
--   Participants (Name+Role)  → wp_task_participants (1:N)
--   In-kind / Subcontracting  → in_kind_subcontracting
--
-- Kept SEPARATE from `activities` (Intake) because the form's
-- Tasks have different granularity than Intake's per-event rows.
-- AI auto-fill synthesises Tasks from Intake activities + WP
-- summary; the user can then edit freely.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS wp_tasks (
  id                       CHAR(36)      NOT NULL,
  work_package_id          CHAR(36)      NOT NULL,
  project_id               CHAR(36)      NOT NULL,
  code                     VARCHAR(20)   DEFAULT NULL,
  title                    VARCHAR(255)  NOT NULL,
  description              TEXT          DEFAULT NULL,
  in_kind_subcontracting   TEXT          DEFAULT NULL,
  sort_order               INT           NOT NULL DEFAULT 0,
  created_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_wp_task_wp      (work_package_id),
  KEY idx_wp_task_project (project_id),
  CONSTRAINT fk_wp_task_wp      FOREIGN KEY (work_package_id) REFERENCES work_packages(id) ON DELETE CASCADE,
  CONSTRAINT fk_wp_task_project FOREIGN KEY (project_id)      REFERENCES projects(id)      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Participants per task with Erasmus role (COO / BEN / AE / AP / OTHER)
CREATE TABLE IF NOT EXISTS wp_task_participants (
  id            CHAR(36)    NOT NULL,
  task_id       CHAR(36)    NOT NULL,
  partner_id    CHAR(36)    NOT NULL,
  role          VARCHAR(10) DEFAULT 'BEN',
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uniq_task_partner (task_id, partner_id),
  KEY idx_wptp_task    (task_id),
  KEY idx_wptp_partner (partner_id),
  CONSTRAINT fk_wptp_task    FOREIGN KEY (task_id)    REFERENCES wp_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_wptp_partner FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
