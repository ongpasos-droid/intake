-- Newsletter subscribers — local source of truth for the mailing list.
-- Downstream sync with MailerLite/Brevo/Buttondown will be a worker,
-- not a dependency of this capture. Ensures we never lose a lead.
--
-- tag semantics (aligned with web_ecosystem_strategy):
--   cold  — signed up via WP blog / newsletter page (no product contact yet)
--   warm  — played the sandbox / created an account in the tool
--   hot   — created a real (non-sandbox) project
-- Promotions are monotonic: cold→warm→hot. Never demote.

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            CHAR(36)     NOT NULL,
  email         VARCHAR(255) NOT NULL,
  source        VARCHAR(32)  NOT NULL DEFAULT 'blog',
  tag           VARCHAR(8)   NOT NULL DEFAULT 'cold',
  user_id       CHAR(36)     NULL,
  consent_ip    VARCHAR(45)  NULL,
  consent_ua    VARCHAR(255) NULL,
  unsubscribed  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email),
  KEY idx_tag (tag),
  KEY idx_source (source),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
