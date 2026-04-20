-- Add active flag and year to form_templates
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='form_templates' AND COLUMN_NAME='active');
SET @sql = IF(@col_exists=0, 'ALTER TABLE form_templates ADD COLUMN active TINYINT(1) DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists2 = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='form_templates' AND COLUMN_NAME='year');
SET @sql2 = IF(@col_exists2=0, 'ALTER TABLE form_templates ADD COLUMN year SMALLINT DEFAULT 2022', 'SELECT 1');
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

UPDATE form_templates SET active = 1, year = 2022 WHERE id = '00000000-0000-4000-b000-000000000001';
