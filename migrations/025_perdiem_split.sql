-- 025: Split per diem into accommodation + subsistence (60/40)

-- Add new columns if they don't exist
SET @dbname = DATABASE();

SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ref_perdiem_rates' AND COLUMN_NAME = 'amount_accommodation';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE ref_perdiem_rates ADD COLUMN amount_accommodation DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER amount_day',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'ref_perdiem_rates' AND COLUMN_NAME = 'amount_subsistence';

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE ref_perdiem_rates ADD COLUMN amount_subsistence DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER amount_accommodation',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Remove duplicate zone rows (keep earliest per zone)
DELETE t1 FROM ref_perdiem_rates t1
INNER JOIN ref_perdiem_rates t2
WHERE t1.id > t2.id AND t1.zone = t2.zone;

-- Populate with 60/40 split where not yet set
UPDATE ref_perdiem_rates
SET amount_accommodation = ROUND(amount_day * 0.60, 2),
    amount_subsistence   = ROUND(amount_day * 0.40, 2)
WHERE amount_accommodation = 0 AND amount_subsistence = 0;

-- Drop columns no longer used (valid_from, valid_to, notes)
-- Kept for backwards compatibility but ignored by UI
