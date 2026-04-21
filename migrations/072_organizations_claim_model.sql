-- ── Organizations claim & access model ─────────────────────────
-- Adds claim_status, access_mode and verification fields to organizations.
-- Conceptual model documented in memory: project_org_claim_model.md
--
-- claim_status: unclaimed (only in `entities`) | claimed_provisional (1+ users, no doc verification) | verified (1 user verified manually)
-- access_mode:  open | request | closed — controls who can use this org in their projects
-- verified_at / verified_by: audit of the manual verification by Oscar

SET @db = DATABASE();

-- claim_status
SET @has_cs = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA=@db AND TABLE_NAME='organizations' AND COLUMN_NAME='claim_status');
SET @sql_cs = IF(@has_cs = 0,
  "ALTER TABLE organizations ADD COLUMN claim_status ENUM('unclaimed','claimed_provisional','verified') NOT NULL DEFAULT 'claimed_provisional'",
  'SELECT 1');
PREPARE st_cs FROM @sql_cs; EXECUTE st_cs; DEALLOCATE PREPARE st_cs;

-- access_mode
SET @has_am = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA=@db AND TABLE_NAME='organizations' AND COLUMN_NAME='access_mode');
SET @sql_am = IF(@has_am = 0,
  "ALTER TABLE organizations ADD COLUMN access_mode ENUM('open','request','closed') NOT NULL DEFAULT 'closed'",
  'SELECT 1');
PREPARE st_am FROM @sql_am; EXECUTE st_am; DEALLOCATE PREPARE st_am;

-- verified_at
SET @has_va = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA=@db AND TABLE_NAME='organizations' AND COLUMN_NAME='verified_at');
SET @sql_va = IF(@has_va = 0,
  'ALTER TABLE organizations ADD COLUMN verified_at TIMESTAMP NULL DEFAULT NULL',
  'SELECT 1');
PREPARE st_va FROM @sql_va; EXECUTE st_va; DEALLOCATE PREPARE st_va;

-- verified_by  (soft FK to users.id; we don't enforce constraint to allow user deletion)
SET @has_vb = (SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA=@db AND TABLE_NAME='organizations' AND COLUMN_NAME='verified_by');
SET @sql_vb = IF(@has_vb = 0,
  'ALTER TABLE organizations ADD COLUMN verified_by VARCHAR(36) NULL DEFAULT NULL',
  'SELECT 1');
PREPARE st_vb FROM @sql_vb; EXECUTE st_vb; DEALLOCATE PREPARE st_vb;
