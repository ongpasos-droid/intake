-- ═══════════════════════════════════════════════════════════════
-- Migration 076: AI usage telemetry log
-- ═══════════════════════════════════════════════════════════════
-- One row per Claude/OpenAI call. Used for:
--   (a) cost tracking per user / per endpoint
--   (b) circuit breaker (e.g. max 50 refinados/user/day)
--   (c) future admin dashboard
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        CHAR(36)        NULL,
  project_id     CHAR(36)        NULL,
  endpoint       VARCHAR(200)    NULL,
  provider       VARCHAR(32)     NOT NULL DEFAULT 'anthropic',
  model          VARCHAR(80)     NULL,
  tokens_in      INT UNSIGNED    NOT NULL DEFAULT 0,
  tokens_out     INT UNSIGNED    NOT NULL DEFAULT 0,
  status         VARCHAR(32)     NOT NULL DEFAULT 'success',
  duration_ms    INT UNSIGNED    NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_aiu_user_created     (user_id, created_at),
  KEY idx_aiu_endpoint_created (endpoint, created_at),
  KEY idx_aiu_created          (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
