-- Migration 031: Add contact_person, email, entity_type to org_stakeholders

SET @tbl = 'org_stakeholders';

SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'contact_person';
SET @sql = IF(@exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN contact_person VARCHAR(255) DEFAULT NULL AFTER description'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'email';
SET @sql = IF(@exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN email VARCHAR(255) DEFAULT NULL AFTER contact_person'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'entity_type';
SET @sql = IF(@exists = 0, CONCAT('ALTER TABLE ', @tbl, ' ADD COLUMN entity_type VARCHAR(100) DEFAULT NULL AFTER entity_name'), 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
