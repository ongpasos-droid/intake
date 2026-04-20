-- ═══════════════════════════════════════════════════════════════
-- Migration 001: Create users table (Auth Central)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id              CHAR(36)      NOT NULL,
  email           VARCHAR(255)  NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL DEFAULT '',
  name            VARCHAR(150)  NOT NULL,
  role            ENUM('admin','user','writer') NOT NULL DEFAULT 'user',
  subscription    ENUM('free','premium')        NOT NULL DEFAULT 'free',
  email_verified  TINYINT(1)    NOT NULL DEFAULT 0,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_subscription (subscription)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
