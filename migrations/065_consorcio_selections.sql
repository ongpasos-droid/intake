-- Project-level selections for EU projects (which ones to include per partner)
CREATE TABLE IF NOT EXISTS project_partner_eu_projects (
  id               CHAR(36)    NOT NULL PRIMARY KEY,
  project_id       CHAR(36)    NOT NULL,
  partner_id       CHAR(36)    NOT NULL,
  eu_project_id    CHAR(36)    NOT NULL,
  created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ppep (project_id, partner_id, eu_project_id),
  INDEX idx_ppep_proj (project_id, partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project-level adapted staff profiles (custom skills_summary per project)
CREATE TABLE IF NOT EXISTS project_partner_staff (
  id               CHAR(36)    NOT NULL PRIMARY KEY,
  project_id       CHAR(36)    NOT NULL,
  partner_id       CHAR(36)    NOT NULL,
  staff_id         CHAR(36)    NOT NULL,
  custom_skills    TEXT         DEFAULT NULL,
  created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_pps (project_id, partner_id, staff_id),
  INDEX idx_pps_proj (project_id, partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
