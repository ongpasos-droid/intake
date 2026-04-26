-- Migration 071: Create ors_crawl_state and ors_crawl_log tables
-- Spec: docs/ORS_CRAWL_SPEC.md §2

CREATE TABLE IF NOT EXISTS ors_crawl_state (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  country_tax_id    VARCHAR(15)  NOT NULL,
  prefix            VARCHAR(10)  NOT NULL,
  status            ENUM('pending','in_progress','done','capped','error') DEFAULT 'pending',
  result_count      INT          NULL,
  error_message     TEXT         NULL,
  started_at        TIMESTAMP    NULL,
  finished_at       TIMESTAMP    NULL,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_country_prefix (country_tax_id, prefix),
  INDEX idx_crawl_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ors_crawl_log (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  country_tax_id VARCHAR(15),
  prefix         VARCHAR(10),
  http_status    INT,
  result_count   INT,
  duration_ms    INT,
  error          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crawl_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
