-- ── Entities cleanup flags & enrichment target view ────────────────
-- Fase B: campos derivados sobre `entities` + vista dedup-URL para Fase C.
--   • vat_invalid: marca VATs basura (NULL, '', 'N/A', 'not applicable', ceros, etc.)
--   • is_social_only: marca entidades cuya `website` apunta sólo a una red social
--     (facebook, linkedin, instagram, twitter, tiktok, youtube, pinterest, bsky, t.me, etc.)
--   • entities_enrichment_targets: vista de URLs únicas crawlables (http/https, no social).
--     Input recomendado para el enrich-batch: una fila = una URL a fetchear, aunque varias
--     entidades la compartan (administraciones, redes de guarderías, ministerios, etc.).
--
-- El runner scripts/migrate.js tolera ER_DUP_FIELDNAME, así que los ALTER son idempotentes.
-- CREATE OR REPLACE VIEW es idempotente por definición.

ALTER TABLE entities ADD COLUMN vat_invalid    TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE entities ADD COLUMN is_social_only TINYINT(1) NOT NULL DEFAULT 0;

UPDATE entities SET vat_invalid = CASE
  WHEN vat IS NULL OR TRIM(vat) = '' THEN 1
  WHEN UPPER(TRIM(vat)) IN (
    'N/A','NA','N.A.','N.A','NOT APPLICABLE','NONE','NULL',
    '-','--','---','0','00','000','0000','00000','000000','0000000','00000000',
    'XXXXX','XXXXXXX','XXXXXXXXX',
    'NO APLICA','NO DISPONIBLE','SIN VAT','NO TIENE','DESCONOCIDO'
  ) THEN 1
  ELSE 0
END;

UPDATE entities SET is_social_only = CASE
  WHEN website IS NOT NULL AND website <> ''
   AND LOWER(website) REGEXP '^https?://([a-z0-9-]+\\.)?(facebook|linkedin|instagram|twitter|tiktok|youtube|pinterest|snapchat|bsky\\.app|t\\.me|fb\\.com|x\\.com)([/.?#]|$)'
  THEN 1 ELSE 0
END;

-- Normalizar: eliminar cualquier espacio dentro de website (URLs no admiten espacios)
UPDATE entities
   SET website = REGEXP_REPLACE(website, '[[:space:]]', '')
 WHERE website REGEXP '[[:space:]]';

CREATE OR REPLACE VIEW entities_enrichment_targets AS
SELECT
  MIN(oid)                                                  AS primary_oid,
  website,
  COUNT(*)                                                  AS n_entities,
  GROUP_CONCAT(DISTINCT country_code ORDER BY country_code) AS countries
FROM entities
WHERE website IS NOT NULL
  AND website <> ''
  AND website REGEXP '^https?://'
  AND is_social_only = 0
GROUP BY website;
