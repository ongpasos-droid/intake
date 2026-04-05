-- Add source_id column to document_chunks for research sources

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'document_chunks' AND COLUMN_NAME = 'source_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE document_chunks ADD COLUMN source_id INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
