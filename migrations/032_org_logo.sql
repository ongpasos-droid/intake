-- Migration 032: Add logo_url to organizations

SET @tbl = 'organizations';
SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'logo_url';
SET @sql = IF(@exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN logo_url VARCHAR(512) DEFAULT NULL AFTER acronym'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
