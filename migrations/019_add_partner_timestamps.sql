-- ═══════════════════════════════════════════════════════════════
-- Migration 019: Add created_at/updated_at to partners table
-- Safe to re-run: checks if columns exist first
-- ═══════════════════════════════════════════════════════════════

SET @db = DATABASE();

SET @has_created = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='partners' AND COLUMN_NAME='created_at');
SET @sql1 = IF(@has_created = 0, 'ALTER TABLE partners ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @has_updated = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=@db AND TABLE_NAME='partners' AND COLUMN_NAME='updated_at');
SET @sql2 = IF(@has_updated = 0, 'ALTER TABLE partners ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
