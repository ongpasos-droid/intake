-- ══════════════════════════════════════════════════════════
-- Migration 027: Organizations (PIF) — main table + user link
-- Database: eplus_tools
-- Date: 2026-04-05
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
  id                      CHAR(36)     NOT NULL PRIMARY KEY,
  owner_user_id           CHAR(36)     DEFAULT NULL,

  -- Core info
  organization_name       VARCHAR(255) NOT NULL,
  legal_name_national     VARCHAR(255) DEFAULT NULL,
  legal_name_latin        VARCHAR(255) DEFAULT NULL,
  acronym                 VARCHAR(50)  DEFAULT NULL,
  org_type                VARCHAR(60)  DEFAULT NULL,
  national_id             VARCHAR(100) DEFAULT NULL,
  pic                     VARCHAR(20)  DEFAULT NULL,
  foundation_date         DATE         DEFAULT NULL,
  country                 VARCHAR(100) DEFAULT NULL,
  region                  VARCHAR(100) DEFAULT NULL,
  city                    VARCHAR(100) DEFAULT NULL,
  address                 VARCHAR(255) DEFAULT NULL,
  post_code               VARCHAR(20)  DEFAULT NULL,
  po_box                  VARCHAR(50)  DEFAULT NULL,
  cedex                   VARCHAR(20)  DEFAULT NULL,
  website                 VARCHAR(255) DEFAULT NULL,
  email                   VARCHAR(255) DEFAULT NULL,
  telephone1              VARCHAR(50)  DEFAULT NULL,
  telephone2              VARCHAR(50)  DEFAULT NULL,
  fax                     VARCHAR(50)  DEFAULT NULL,

  -- Profile
  is_public_body          TINYINT(1)   NOT NULL DEFAULT 0,
  is_non_profit           TINYINT(1)   NOT NULL DEFAULT 0,

  -- Background & experience
  description             TEXT         DEFAULT NULL,
  activities_experience   TEXT         DEFAULT NULL,
  has_eu_projects         TINYINT(1)   NOT NULL DEFAULT 0,

  -- Legal representative (embedded — one per org)
  legal_rep_title         VARCHAR(20)  DEFAULT NULL,
  legal_rep_gender        VARCHAR(20)  DEFAULT NULL,
  legal_rep_first_name    VARCHAR(100) DEFAULT NULL,
  legal_rep_family_name   VARCHAR(100) DEFAULT NULL,
  legal_rep_department    VARCHAR(150) DEFAULT NULL,
  legal_rep_position      VARCHAR(150) DEFAULT NULL,
  legal_rep_email         VARCHAR(255) DEFAULT NULL,
  legal_rep_telephone1    VARCHAR(50)  DEFAULT NULL,
  legal_rep_telephone2    VARCHAR(50)  DEFAULT NULL,
  legal_rep_same_address  TINYINT(1)   NOT NULL DEFAULT 1,
  legal_rep_address       VARCHAR(255) DEFAULT NULL,
  legal_rep_country       VARCHAR(100) DEFAULT NULL,
  legal_rep_region        VARCHAR(100) DEFAULT NULL,
  legal_rep_city          VARCHAR(100) DEFAULT NULL,
  legal_rep_post_code     VARCHAR(20)  DEFAULT NULL,
  legal_rep_po_box        VARCHAR(50)  DEFAULT NULL,
  legal_rep_cedex         VARCHAR(20)  DEFAULT NULL,

  -- Contact person (embedded — one per org)
  cp_title                VARCHAR(20)  DEFAULT NULL,
  cp_gender               VARCHAR(20)  DEFAULT NULL,
  cp_first_name           VARCHAR(100) DEFAULT NULL,
  cp_family_name          VARCHAR(100) DEFAULT NULL,
  cp_department           VARCHAR(150) DEFAULT NULL,
  cp_position             VARCHAR(150) DEFAULT NULL,
  cp_email                VARCHAR(255) DEFAULT NULL,
  cp_telephone1           VARCHAR(50)  DEFAULT NULL,
  cp_telephone2           VARCHAR(50)  DEFAULT NULL,
  cp_same_address         TINYINT(1)   NOT NULL DEFAULT 1,
  cp_address              VARCHAR(255) DEFAULT NULL,
  cp_country              VARCHAR(100) DEFAULT NULL,
  cp_region               VARCHAR(100) DEFAULT NULL,
  cp_city                 VARCHAR(100) DEFAULT NULL,
  cp_post_code            VARCHAR(20)  DEFAULT NULL,
  cp_po_box               VARCHAR(50)  DEFAULT NULL,
  cp_cedex                VARCHAR(20)  DEFAULT NULL,

  -- Visibility / state
  is_public               TINYINT(1)   NOT NULL DEFAULT 1,
  active                  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Add organization_id to users ────────────────────────────
-- The migration runner tolerates ER_DUP_FIELDNAME on re-runs
ALTER TABLE users ADD COLUMN organization_id CHAR(36) DEFAULT NULL;
