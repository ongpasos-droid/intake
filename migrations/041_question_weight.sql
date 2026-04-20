-- 041: Add weight (percentage) to eval_questions

SET @tbl = 'eval_questions';

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'weight';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE eval_questions ADD COLUMN weight DECIMAL(5,1) NOT NULL DEFAULT 0 AFTER scoring_logic',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
