-- ═══════════════════════════════════════════════════════════════
-- Migration 070: Criteria narrative brief format (decision 2026-04-20)
-- Adds new fields to eval_questions (Part A block) and eval_criteria
-- (5-field narrative brief). Old columns preserved for compatibility —
-- will be dropped in a later migration once all criteria migrated.
-- Idempotent: checks column existence before ALTER.
-- ═══════════════════════════════════════════════════════════════

-- ─── eval_questions: Parte A (bloque genérico de la pregunta) ────

SET @tbl = 'eval_questions';

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'general_context';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_questions ADD COLUMN general_context TEXT DEFAULT NULL AFTER description',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'connects_from';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_questions ADD COLUMN connects_from TEXT DEFAULT NULL AFTER general_context',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'connects_to';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_questions ADD COLUMN connects_to TEXT DEFAULT NULL AFTER connects_from',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'global_rule';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_questions ADD COLUMN global_rule TEXT DEFAULT NULL AFTER connects_to',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── eval_criteria: 5-field narrative brief + priority ────────────

SET @tbl = 'eval_criteria';

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'intent';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_criteria ADD COLUMN intent TEXT DEFAULT NULL AFTER mandatory',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'elements';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_criteria ADD COLUMN elements TEXT DEFAULT NULL AFTER intent',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'example_weak';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_criteria ADD COLUMN example_weak TEXT DEFAULT NULL AFTER elements',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'example_strong';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_criteria ADD COLUMN example_strong TEXT DEFAULT NULL AFTER example_weak',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'avoid';
SET @sql = IF(@col = 0,
  'ALTER TABLE eval_criteria ADD COLUMN avoid TEXT DEFAULT NULL AFTER example_strong',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @col FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tbl AND COLUMN_NAME = 'priority';
SET @sql = IF(@col = 0,
  CONCAT('ALTER TABLE eval_criteria ADD COLUMN priority ENUM(',
         CHAR(39),'alta',CHAR(39),',',CHAR(39),'media',CHAR(39),',',CHAR(39),'baja',CHAR(39),
         ') NOT NULL DEFAULT ',CHAR(39),'media',CHAR(39),' AFTER mandatory'),
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ─── eval_criteria_rubric: auto-derived rubric (Option C) ─────────
--  rubric JSON = { score_levels: {0:..,5:..,10:..}, critical_caps:[..], checklist_items:[..] }
--  auto_generated_at = last time briefToRubric() populated it
--  edited_at = last manual edit in admin (if any) — tells us rubric diverges from brief

CREATE TABLE IF NOT EXISTS eval_criteria_rubric (
  criterion_id        CHAR(36)  NOT NULL PRIMARY KEY,
  rubric              JSON      NOT NULL,
  brief_hash          CHAR(64)  DEFAULT NULL,
  auto_generated_at   DATETIME  DEFAULT NULL,
  edited_at           DATETIME  DEFAULT NULL,
  edited_by           CHAR(36)  DEFAULT NULL,
  created_at          DATETIME  NOT NULL DEFAULT NOW(),
  updated_at          DATETIME  NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (criterion_id) REFERENCES eval_criteria(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
