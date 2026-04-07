-- ═══════════════════════════════════════════════════════════════
-- Migration 047: Deduplicate ref_entities and ensure unique index
-- ═══════════════════════════════════════════════════════════════

-- Delete duplicate rows keeping the one with the smallest id per (name, country_iso2)
DELETE e1 FROM ref_entities e1
INNER JOIN ref_entities e2
  ON e1.name = e2.name
  AND e1.country_iso2 = e2.country_iso2
  AND e1.id > e2.id;

-- Ensure unique index exists (tolerant to ER_DUP_KEYNAME = already exists)
CREATE UNIQUE INDEX uq_entity_name_country ON ref_entities (name, country_iso2);
