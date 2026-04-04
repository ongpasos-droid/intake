-- ── Matriz tarifas personal × zona ───────────────────────────────
-- Cada categoría (R1-R4) tiene tarifa distinta por zona (A/B/C/D)
-- Fuente: Erasmus+ 2024 Programme Guide +5% redondeado al alza

CREATE TABLE IF NOT EXISTS ref_worker_zone_rates (
  id           CHAR(36)        NOT NULL PRIMARY KEY,
  category_id  CHAR(36)        NOT NULL,
  zone         CHAR(1)         NOT NULL,
  rate_day     DECIMAL(8,2)    NOT NULL,
  UNIQUE KEY uq_cat_zone (category_id, zone),
  FOREIGN KEY (category_id) REFERENCES ref_worker_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed via INSERT … SELECT para evitar hardcodear UUIDs
INSERT INTO ref_worker_zone_rates (id, category_id, zone, rate_day)
SELECT UUID(), c.id, z.zone, z.rate_day
FROM ref_worker_categories c
JOIN (
  SELECT 'R1' AS code, 'A' AS zone, 309 AS rate_day UNION ALL
  SELECT 'R1','B',240 UNION ALL SELECT 'R1','C',174 UNION ALL SELECT 'R1','D',174 UNION ALL
  SELECT 'R2','A',254 UNION ALL SELECT 'R2','B',197 UNION ALL SELECT 'R2','C',142 UNION ALL SELECT 'R2','D',142 UNION ALL
  SELECT 'R3','A',205 UNION ALL SELECT 'R3','B',159 UNION ALL SELECT 'R3','C',115 UNION ALL SELECT 'R3','D',115 UNION ALL
  SELECT 'R4','A',144 UNION ALL SELECT 'R4','B',113 UNION ALL SELECT 'R4','C',82  UNION ALL SELECT 'R4','D',82
) z ON z.code = c.code
ON DUPLICATE KEY UPDATE rate_day = VALUES(rate_day);
