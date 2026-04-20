-- ══════════════════════════════════════════════════════════
-- Migration 029: Extra PIF fields from Wizard review
-- Database: eplus_tools
-- Date: 2026-04-05
-- ══════════════════════════════════════════════════════════

-- ── organizations: capacity fields ──────────────────────────
ALTER TABLE organizations ADD COLUMN staff_size INT DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN annual_projects INT DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN has_training_facilities TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN has_digital_infrastructure TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE organizations ADD COLUMN expertise_areas TEXT DEFAULT NULL;
ALTER TABLE organizations ADD COLUMN erasmus_roles TEXT DEFAULT NULL;

-- ── org_key_staff: role field ───────────────────────────────
ALTER TABLE org_key_staff ADD COLUMN role VARCHAR(150) DEFAULT NULL;

-- ── org_eu_projects: title field ────────────────────────────
ALTER TABLE org_eu_projects ADD COLUMN title VARCHAR(255) DEFAULT NULL;

-- ── org_associated_partners: extra contact fields ───────────
ALTER TABLE org_associated_partners ADD COLUMN contact_person VARCHAR(200) DEFAULT NULL;
ALTER TABLE org_associated_partners ADD COLUMN email VARCHAR(255) DEFAULT NULL;
ALTER TABLE org_associated_partners ADD COLUMN phone VARCHAR(50) DEFAULT NULL;
ALTER TABLE org_associated_partners ADD COLUMN website VARCHAR(255) DEFAULT NULL;
ALTER TABLE org_associated_partners ADD COLUMN relation_to_project TEXT DEFAULT NULL;
