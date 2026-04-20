-- ═══════════════════════════════════════════════════════════════
-- Migration 021: Create ref_entities table (entity directory)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ref_entities (
  id            CHAR(36)     NOT NULL PRIMARY KEY,
  name          VARCHAR(200) NOT NULL,
  city          VARCHAR(100),
  country_iso2  CHAR(2)      NOT NULL,
  type          VARCHAR(60)  NOT NULL DEFAULT 'ngo',
  pic_number    VARCHAR(20),
  website       VARCHAR(255),
  notes         TEXT,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at    DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unique constraint to prevent duplicate seeds (migrate.js tolerates ER_DUP_KEYNAME)
CREATE UNIQUE INDEX uq_entity_name_country ON ref_entities (name, country_iso2);

-- ── Seed: organizaciones reales habituales en proyectos Erasmus+ ──
INSERT IGNORE INTO ref_entities (id, name, city, country_iso2, type, pic_number) VALUES
  (UUID(), 'Fundación General de la Universidad de Valladolid', 'Valladolid', 'ES', 'university', '999862809'),
  (UUID(), 'Università degli Studi di Milano', 'Milán', 'IT', 'university', '999995796'),
  (UUID(), 'Universitat de Barcelona', 'Barcelona', 'ES', 'university', '999986387'),
  (UUID(), 'Vrije Universiteit Brussel', 'Bruselas', 'BE', 'university', '999902094'),
  (UUID(), 'Universität Wien', 'Viena', 'AT', 'university', '999866883'),
  (UUID(), 'Uniwersytet Jagielloński', 'Cracovia', 'PL', 'university', '999642716'),
  (UUID(), 'Aristotle University of Thessaloniki', 'Tesalónica', 'GR', 'university', '999895692'),
  (UUID(), 'Lunds Universitet', 'Lund', 'SE', 'university', '999901318'),
  (UUID(), 'CESIE', 'Palermo', 'IT', 'ngo', '959264452'),
  (UUID(), 'Youth Express Network', 'Estrasburgo', 'FR', 'ngo', '949597544'),
  (UUID(), 'Politecnico di Milano', 'Milán', 'IT', 'university', '999879881'),
  (UUID(), 'Asociación Building Bridges', 'Salamanca', 'ES', 'ngo', NULL),
  (UUID(), 'Permacultura Cantabria', 'Santander', 'ES', 'ngo', NULL),
  (UUID(), 'European Youth Forum', 'Bruselas', 'BE', 'ngo', '999613422'),
  (UUID(), 'Instituto de la Juventud (INJUVE)', 'Madrid', 'ES', 'public_body', '999483539');
