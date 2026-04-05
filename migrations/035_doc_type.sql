-- 035: Add doc_type column to documents
SET @col_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documents' AND COLUMN_NAME = 'doc_type');

SET @sql = IF(@col_exists = 0,
  "ALTER TABLE documents ADD COLUMN doc_type VARCHAR(20) DEFAULT 'support' AFTER owner_id",
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
