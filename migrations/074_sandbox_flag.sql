-- Sandbox flag on projects
-- Marks projects created from the sandbox landing (/sandbox on WP).
-- When is_sandbox=1, the UI shows "MODO DEMO" banner and hides
-- export / submit / invite features. A "Graduate" button in the
-- tool sets is_sandbox=0 and promotes the project to real.
--
-- Idempotent via information_schema check (MySQL 8 has no IF NOT EXISTS
-- for ADD COLUMN, per CLAUDE.md).

SET @col_exists := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'projects'
    AND COLUMN_NAME  = 'is_sandbox'
);

SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE projects ADD COLUMN is_sandbox TINYINT(1) NOT NULL DEFAULT 0 AFTER status',
  'SELECT "projects.is_sandbox already exists — skipping" AS msg'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
