-- Migration 070: Create entities table for ORS ingestion
-- Spec: docs/ORS_CRAWL_SPEC.md §2

CREATE TABLE IF NOT EXISTS entities (
  oid               VARCHAR(15)   PRIMARY KEY,
  pic               VARCHAR(15)   NULL,
  legal_name        VARCHAR(500)  NOT NULL,
  business_name     VARCHAR(500)  NULL,
  country_code      CHAR(2)       NULL,
  country_tax_id    VARCHAR(15)   NULL,
  city              VARCHAR(200)  NULL,
  website           VARCHAR(500)  NULL,
  website_show      VARCHAR(500)  NULL,
  vat               VARCHAR(50)   NULL,
  registration_no   VARCHAR(200)  NULL,
  validity_type     VARCHAR(15)   NULL,
  validity_label    VARCHAR(30)   NULL,
  go_to_link        VARCHAR(500)  NULL,
  source            VARCHAR(30)   DEFAULT 'ors_api',
  first_seen_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  last_seen_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  raw_json          JSON          NULL,

  INDEX idx_ent_pic (pic),
  INDEX idx_ent_country (country_code),
  INDEX idx_ent_city (city),
  INDEX idx_ent_legal_name (legal_name(191)),
  INDEX idx_ent_vat (vat),
  INDEX idx_ent_validity (validity_label),
  FULLTEXT idx_ent_search (legal_name, business_name, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
