-- ── Stats cache para Partner Engine ────────────────────────────
-- Tabla de agregados precomputados sobre las 165k entidades reales.
-- Alimentada por:
--   • Local: dump del VPS con valores reales (TRUNCATE + INSERT).
--   • Producción: cron job que recompute periódicamente (TBD).
--
-- Cada fila almacena un agregado bajo una clave (metric_key) con el valor
-- como JSON. Lectura desde /v1/entities/stats/* es un simple SELECT por clave.

CREATE TABLE IF NOT EXISTS stats_cache (
  metric_key  VARCHAR(80) NOT NULL,
  value       JSON        NOT NULL,
  computed_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (metric_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
