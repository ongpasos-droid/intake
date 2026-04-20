-- ══════════════════════════════════════════════════════════
-- Migration 028: Organization child tables
-- Database: eplus_tools
-- Date: 2026-04-05
-- ══════════════════════════════════════════════════════════

-- ── Accreditations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_accreditations (
  id                      CHAR(36)     NOT NULL PRIMARY KEY,
  organization_id         CHAR(36)     NOT NULL,
  accreditation_type      VARCHAR(150) DEFAULT NULL,
  accreditation_reference VARCHAR(150) DEFAULT NULL,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_acc_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── EU Projects history ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_eu_projects (
  id                      CHAR(36)     NOT NULL PRIMARY KEY,
  organization_id         CHAR(36)     NOT NULL,
  programme               VARCHAR(100) DEFAULT NULL,
  year                    INT          DEFAULT NULL,
  project_id_or_contract  VARCHAR(150) DEFAULT NULL,
  role                    VARCHAR(50)  DEFAULT NULL,
  beneficiary_name        VARCHAR(255) DEFAULT NULL,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_eup_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Key staff (operational capacity) ────────────────────────
CREATE TABLE IF NOT EXISTS org_key_staff (
  id                      CHAR(36)     NOT NULL PRIMARY KEY,
  organization_id         CHAR(36)     NOT NULL,
  name                    VARCHAR(200) DEFAULT NULL,
  skills_summary          TEXT         DEFAULT NULL,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ks_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Stakeholders (related entities) ─────────────────────────
CREATE TABLE IF NOT EXISTS org_stakeholders (
  id                      CHAR(36)     NOT NULL PRIMARY KEY,
  organization_id         CHAR(36)     NOT NULL,
  related_org_id          CHAR(36)     DEFAULT NULL,
  entity_name             VARCHAR(255) DEFAULT NULL,
  relationship_type       VARCHAR(100) DEFAULT NULL,
  description             TEXT         DEFAULT NULL,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sh_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Associated partners ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_associated_partners (
  id                      CHAR(36)     NOT NULL PRIMARY KEY,
  organization_id         CHAR(36)     NOT NULL,
  full_name               VARCHAR(255) DEFAULT NULL,
  address                 VARCHAR(255) DEFAULT NULL,
  street_number           VARCHAR(50)  DEFAULT NULL,
  country                 VARCHAR(100) DEFAULT NULL,
  region                  VARCHAR(100) DEFAULT NULL,
  post_code               VARCHAR(20)  DEFAULT NULL,
  city                    VARCHAR(100) DEFAULT NULL,
  org_type                VARCHAR(60)  DEFAULT NULL,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ap_org FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
