-- 042: Add eval_notes to eval_sections (E+ guide notes per section)

SET @tbl = 'eval_sections';

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'eval_notes';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE eval_sections ADD COLUMN eval_notes TEXT DEFAULT NULL AFTER max_score',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
