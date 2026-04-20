-- ═══════════════════════════════════════════════════════════════
-- Migration 058: Add gantt month columns to activities
-- ═══════════════════════════════════════════════════════════════

SET @dbname = DATABASE();
SET @tablename = 'activities';

-- gantt_start_month
SET @col = 'gantt_start_month';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @col, '` INT NULL DEFAULT NULL AFTER `order_index`'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- gantt_end_month
SET @col = 'gantt_end_month';
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @col);
SET @sql = IF(@exists = 0,
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @col, '` INT NULL DEFAULT NULL AFTER `gantt_start_month`'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
