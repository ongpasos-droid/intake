-- ── Admin reference tables ───────────────────────────────────────
-- ref_countries    — países elegibles Erasmus+ con zona per diem
-- ref_perdiem_rates — tarifas per diem por zona (cambian cada año)
-- ref_worker_categories — categorías de personal con tarifa estándar

CREATE TABLE IF NOT EXISTS ref_countries (
  id              CHAR(36)     NOT NULL PRIMARY KEY,
  iso2            CHAR(2)      NOT NULL UNIQUE,
  name_es         VARCHAR(100) NOT NULL,
  name_en         VARCHAR(100) NOT NULL,
  eu_member       TINYINT(1)   NOT NULL DEFAULT 0,
  erasmus_eligible TINYINT(1)  NOT NULL DEFAULT 1,
  perdiem_zone    VARCHAR(10)  NOT NULL DEFAULT 'A',
  notes           TEXT,
  active          TINYINT(1)   NOT NULL DEFAULT 1,
  updated_at      DATETIME     NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_ref_countries_iso2 ON ref_countries(iso2);
CREATE INDEX IF NOT EXISTS idx_ref_countries_zone ON ref_countries(perdiem_zone);

-- ── Seed: países más comunes en proyectos Erasmus+ ───────────────
INSERT INTO ref_countries (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone) VALUES
  (UUID(), 'DE', 'Alemania',       'Germany',        1, 1, 'A'),
  (UUID(), 'AT', 'Austria',        'Austria',         1, 1, 'A'),
  (UUID(), 'BE', 'Bélgica',        'Belgium',         1, 1, 'A'),
  (UUID(), 'BG', 'Bulgaria',       'Bulgaria',        1, 1, 'D'),
  (UUID(), 'CY', 'Chipre',         'Cyprus',          1, 1, 'B'),
  (UUID(), 'HR', 'Croacia',        'Croatia',         1, 1, 'C'),
  (UUID(), 'DK', 'Dinamarca',      'Denmark',         1, 1, 'A'),
  (UUID(), 'SK', 'Eslovaquia',     'Slovakia',        1, 1, 'D'),
  (UUID(), 'SI', 'Eslovenia',      'Slovenia',        1, 1, 'C'),
  (UUID(), 'ES', 'España',         'Spain',           1, 1, 'B'),
  (UUID(), 'EE', 'Estonia',        'Estonia',         1, 1, 'C'),
  (UUID(), 'FI', 'Finlandia',      'Finland',         1, 1, 'A'),
  (UUID(), 'FR', 'Francia',        'France',          1, 1, 'A'),
  (UUID(), 'GR', 'Grecia',         'Greece',          1, 1, 'B'),
  (UUID(), 'HU', 'Hungría',        'Hungary',         1, 1, 'D'),
  (UUID(), 'IE', 'Irlanda',        'Ireland',         1, 1, 'A'),
  (UUID(), 'IT', 'Italia',         'Italy',           1, 1, 'B'),
  (UUID(), 'LV', 'Letonia',        'Latvia',          1, 1, 'C'),
  (UUID(), 'LT', 'Lituania',       'Lithuania',       1, 1, 'C'),
  (UUID(), 'LU', 'Luxemburgo',     'Luxembourg',      1, 1, 'A'),
  (UUID(), 'MT', 'Malta',          'Malta',           1, 1, 'C'),
  (UUID(), 'NL', 'Países Bajos',   'Netherlands',     1, 1, 'A'),
  (UUID(), 'PL', 'Polonia',        'Poland',          1, 1, 'D'),
  (UUID(), 'PT', 'Portugal',       'Portugal',        1, 1, 'C'),
  (UUID(), 'CZ', 'República Checa','Czech Republic',  1, 1, 'C'),
  (UUID(), 'RO', 'Rumanía',        'Romania',         1, 1, 'D'),
  (UUID(), 'SE', 'Suecia',         'Sweden',          1, 1, 'A'),
  (UUID(), 'IS', 'Islandia',       'Iceland',         0, 1, 'A'),
  (UUID(), 'LI', 'Liechtenstein',  'Liechtenstein',   0, 1, 'A'),
  (UUID(), 'NO', 'Noruega',        'Norway',          0, 1, 'A'),
  (UUID(), 'MK', 'Macedonia del Norte','North Macedonia',0,1,'D'),
  (UUID(), 'RS', 'Serbia',         'Serbia',          0, 1, 'D'),
  (UUID(), 'TR', 'Turquía',        'Turkey',          0, 1, 'D'),
  (UUID(), 'UA', 'Ucrania',        'Ukraine',         0, 1, 'D'),
  (UUID(), 'AM', 'Armenia',        'Armenia',         0, 1, 'D'),
  (UUID(), 'AZ', 'Azerbaiyán',     'Azerbaijan',      0, 1, 'D'),
  (UUID(), 'GE', 'Georgia',        'Georgia',         0, 1, 'D'),
  (UUID(), 'MD', 'Moldavia',       'Moldova',         0, 1, 'D');

-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ref_perdiem_rates (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  zone        VARCHAR(10)   NOT NULL,
  amount_day  DECIMAL(8,2)  NOT NULL,
  valid_from  DATE          NOT NULL,
  valid_to    DATE,
  notes       TEXT,
  updated_at  DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX IF NOT EXISTS idx_perdiem_zone ON ref_perdiem_rates(zone);

-- Seed: tarifas 2024-2026 (guía de programas Erasmus+)
INSERT INTO ref_perdiem_rates (id, zone, amount_day, valid_from, notes) VALUES
  (UUID(), 'A', 180.00, '2024-01-01', 'Zona A — países con coste de vida más alto'),
  (UUID(), 'B', 160.00, '2024-01-01', 'Zona B — países con coste de vida medio-alto'),
  (UUID(), 'C', 140.00, '2024-01-01', 'Zona C — países con coste de vida medio'),
  (UUID(), 'D', 120.00, '2024-01-01', 'Zona D — países con coste de vida más bajo');

-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ref_worker_categories (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  code        VARCHAR(30)   NOT NULL UNIQUE,
  name_es     VARCHAR(100)  NOT NULL,
  name_en     VARCHAR(100)  NOT NULL,
  rate_day    DECIMAL(8,2)  NOT NULL,
  notes       TEXT,
  active      TINYINT(1)    NOT NULL DEFAULT 1,
  updated_at  DATETIME      NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed: categorías estándar Erasmus+
INSERT INTO ref_worker_categories (id, code, name_es, name_en, rate_day, notes) VALUES
  (UUID(), 'R1', 'Investigador / Profesional senior', 'Researcher / Senior professional', 294.00, 'Categoría R1 — máxima tarifa estándar'),
  (UUID(), 'R2', 'Profesional reconocido',            'Recognised professional',          241.00, 'Categoría R2'),
  (UUID(), 'R3', 'Técnico / Profesional junior',      'Technician / Junior professional', 195.00, 'Categoría R3'),
  (UUID(), 'R4', 'Auxiliar / Apoyo administrativo',   'Support staff / Administrative',   137.00, 'Categoría R4 — tarifa mínima estándar');
