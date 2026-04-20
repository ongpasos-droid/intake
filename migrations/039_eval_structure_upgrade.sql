-- 039: Upgrade eval structure — new fields for questions, criteria, and program writing rules
-- Idempotent: checks column existence before ALTER

-- ═══════════════════════════════════════════════════════════════
-- 1. call_eligibility: writing_style + ai_detection_rules
-- ═══════════════════════════════════════════════════════════════

SET @tbl = 'call_eligibility';

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'writing_style';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE call_eligibility ADD COLUMN writing_style TEXT DEFAULT NULL AFTER additional_rules',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'ai_detection_rules';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE call_eligibility ADD COLUMN ai_detection_rules TEXT DEFAULT NULL AFTER writing_style',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════
-- 2. eval_questions: description (rename prompt), word_limit, page_limit,
--    writing_guidance, scoring_logic
-- ═══════════════════════════════════════════════════════════════

SET @tbl = 'eval_questions';

-- Rename prompt → description (check if description already exists)
SELECT COUNT(*) INTO @old_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'prompt';
SELECT COUNT(*) INTO @new_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'description';
SET @sql = IF(@old_exists = 1 AND @new_exists = 0,
  'ALTER TABLE eval_questions CHANGE COLUMN prompt description TEXT DEFAULT NULL',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'word_limit';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE eval_questions ADD COLUMN word_limit INT DEFAULT NULL AFTER description',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'page_limit';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE eval_questions ADD COLUMN page_limit DECIMAL(5,1) DEFAULT NULL AFTER word_limit',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'writing_guidance';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE eval_questions ADD COLUMN writing_guidance TEXT DEFAULT NULL AFTER page_limit',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'scoring_logic';
SET @sql = IF(@col_exists = 0,
  CONCAT('ALTER TABLE eval_questions ADD COLUMN scoring_logic ENUM(', CHAR(39), 'sum', CHAR(39), ',', CHAR(39), 'average', CHAR(39), ',', CHAR(39), 'min', CHAR(39), ') NOT NULL DEFAULT ', CHAR(39), 'sum', CHAR(39), ' AFTER writing_guidance'),
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ═══════════════════════════════════════════════════════════════
-- 3. eval_criteria: red_flags + score_rubric
-- ═══════════════════════════════════════════════════════════════

SET @tbl = 'eval_criteria';

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'red_flags';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE eval_criteria ADD COLUMN red_flags TEXT DEFAULT NULL AFTER rules',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT COUNT(*) INTO @col_exists FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'score_rubric';
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE eval_criteria ADD COLUMN score_rubric JSON DEFAULT NULL AFTER red_flags',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
