-- ═══════════════════════════════════════════════════════════════
-- Migration 024: Evaluation rules per program/convocatoria
-- eval_sections > eval_questions > eval_criteria
-- Linked to intake_programs (convocatorias)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS eval_sections (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  program_id      CHAR(36)     NOT NULL,
  title           VARCHAR(200) NOT NULL,
  color           VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT NOW(),
  updated_at      DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (program_id) REFERENCES intake_programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eval_questions (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  section_id      CHAR(36)     NOT NULL,
  code            VARCHAR(20)  NOT NULL,
  title           VARCHAR(500) NOT NULL,
  prompt          TEXT,
  max_score       DECIMAL(5,1) NOT NULL DEFAULT 0,
  threshold       DECIMAL(5,1) NOT NULL DEFAULT 0,
  general_rules   JSON,
  score_caps      JSON,
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT NOW(),
  updated_at      DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (section_id) REFERENCES eval_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eval_criteria (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  question_id     CHAR(36)     NOT NULL,
  title           VARCHAR(500) NOT NULL,
  max_score       DECIMAL(5,1) NOT NULL DEFAULT 1,
  mandatory       TINYINT(1)   NOT NULL DEFAULT 0,
  meaning         TEXT,
  structure       TEXT,
  relations       TEXT,
  rules           TEXT,
  sort_order      INT          NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT NOW(),
  updated_at      DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (question_id) REFERENCES eval_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
