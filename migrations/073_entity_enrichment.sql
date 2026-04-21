-- ── Entity enrichment (web crawler output) ─────────────────────────
-- Output table of the web-crawler that enriches the 285K+ entities from ORS
-- by fetching each entity's website and extracting identity/contact/quality signals.
--
-- Key design notes:
--   • oid is PK (no FK to `entities`) so the table can exist locally without mirroring 285K rows
--     and survive any rebuild of `entities` without cascading enrichment loss.
--   • content_hash (sha256 of sanitized text) allows change detection without keeping full history.
--   • Arrays and multi-value fields stored as JSON (emails, phones, addresses, social_links, etc.).
--   • All sanitization of injection-prone HTML happens BEFORE writing here — raw html is never stored.

CREATE TABLE IF NOT EXISTS entity_enrichment (
  oid VARCHAR(15) NOT NULL,

  -- Fetch operational metadata
  first_fetched_at TIMESTAMP NULL DEFAULT NULL,
  last_fetched_at  TIMESTAMP NULL DEFAULT NULL,
  fetch_attempts   INT NOT NULL DEFAULT 0,
  error_type       VARCHAR(60) NULL DEFAULT NULL,
  error_message    TEXT NULL,
  http_status_final SMALLINT NULL,
  redirect_chain   JSON NULL,
  final_url        VARCHAR(1000) NULL,
  ssl_valid        TINYINT(1) NULL,
  content_hash     CHAR(64) NULL,

  -- Entity identity
  extracted_name      VARCHAR(500) NULL,
  description         TEXT NULL,
  parent_organization VARCHAR(500) NULL,
  legal_form          VARCHAR(60) NULL,
  year_founded        SMALLINT NULL,
  vat_number          VARCHAR(100) NULL,
  tax_id_national     VARCHAR(100) NULL,
  oid_erasmus_on_site VARCHAR(20) NULL,
  pic_on_site         VARCHAR(20) NULL,

  -- Contact (JSON arrays / objects)
  emails    JSON NULL,
  phones    JSON NULL,
  addresses JSON NULL,

  -- Web signals
  website_languages JSON NULL,
  social_links      JSON NULL,
  cms_detected      VARCHAR(60) NULL,
  copyright_year    SMALLINT NULL,
  last_news_date    DATE NULL,
  logo_url          VARCHAR(1000) NULL,
  sitemap_lastmod   DATETIME NULL,

  -- Staff & network
  staff_names         JSON NULL,
  network_memberships JSON NULL,

  -- EU programs
  eu_programs               JSON NULL,
  has_erasmus_accreditation TINYINT(1) NULL,
  has_etwinning_label       TINYINT(1) NULL,

  -- Size metrics
  students_count  INT NULL,
  teachers_count  INT NULL,
  employees_count INT NULL,
  num_locations   SMALLINT NULL,

  -- Behavior / commerce signals
  has_donate_button     TINYINT(1) NULL,
  has_newsletter_signup TINYINT(1) NULL,
  has_privacy_policy    TINYINT(1) NULL,

  -- Scores 0-100
  score_professionalism TINYINT NULL,
  score_eu_readiness    TINYINT NULL,
  score_vitality        TINYINT NULL,
  score_squat_risk      TINYINT NULL,

  -- Quality flags
  mismatch_level ENUM('none','tld_mismatch','redirect_to_other_country','content_mismatch','social_only','unknown') NULL DEFAULT NULL,
  name_matches_domain      TINYINT(1) NULL,
  likely_squatted          TINYINT(1) NULL,
  likely_wrong_entity_type TINYINT(1) NULL,

  PRIMARY KEY (oid),
  INDEX idx_last_fetched (last_fetched_at),
  INDEX idx_error_type   (error_type),
  INDEX idx_content_hash (content_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
