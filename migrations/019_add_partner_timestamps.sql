-- ═══════════════════════════════════════════════════════════════
-- Migration 019: Add created_at/updated_at to partners table
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE partners
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
