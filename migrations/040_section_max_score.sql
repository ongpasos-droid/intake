-- 040: Add max_score to eval_sections (EU-fixed score per block)

SET @tbl = 'eval_sections';

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'max_score';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE eval_sections ADD COLUMN max_score DECIMAL(5,1) NOT NULL DEFAULT 0 AFTER color',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
