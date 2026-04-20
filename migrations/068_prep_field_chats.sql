CREATE TABLE IF NOT EXISTS prep_field_chats (
  id          CHAR(36)    NOT NULL PRIMARY KEY,
  project_id  CHAR(36)    NOT NULL,
  field_key   VARCHAR(20) NOT NULL,
  role        VARCHAR(10) NOT NULL,
  content     TEXT        NOT NULL,
  turn_order  INT         NOT NULL DEFAULT 0,
  created_at  DATETIME    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pfc_project_field (project_id, field_key)
);
