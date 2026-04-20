-- Extra staff added specifically for a project (not from org profile)
CREATE TABLE IF NOT EXISTS project_extra_staff (
  id               CHAR(36)    NOT NULL PRIMARY KEY,
  project_id       CHAR(36)    NOT NULL,
  partner_id       CHAR(36)    NOT NULL,
  name             VARCHAR(200) DEFAULT NULL,
  role             VARCHAR(150) DEFAULT NULL,
  skills_summary   TEXT         DEFAULT NULL,
  created_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pes_proj (project_id, partner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
