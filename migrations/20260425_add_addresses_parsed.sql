-- 20260425 — Add structured-address columns to entity_enrichment
--
-- Why: the existing column `addresses` is JSON ARRAY OF STRINGS (raw text),
-- which is fine to store but useless to map/filter. We add a parallel
-- `addresses_parsed` column that holds an ARRAY OF OBJECTS:
--
--   [
--     {
--       "street": "Calle Mayor 1",
--       "postal_code": "28013",
--       "city": "Madrid",
--       "region": "Madrid",
--       "country": "ES",
--       "source": "jsonld" | "microdata" | "address_tag" | "footer_regex" | "contact_page",
--       "raw": "Calle Mayor 1, 28013 Madrid, Spain"
--     }
--   ]
--
-- We keep `addresses` untouched for backwards compatibility.
-- `last_addr_extract_at` lets the deep extractor skip rows already attempted
-- recently without losing the original `last_fetched_at` from the main pipeline.

ALTER TABLE entity_enrichment
  ADD COLUMN addresses_parsed JSON DEFAULT NULL AFTER addresses,
  ADD COLUMN last_addr_extract_at TIMESTAMP NULL DEFAULT NULL AFTER addresses_parsed;

-- Helps the worker pick the next batch quickly.
CREATE INDEX idx_last_addr_extract ON entity_enrichment (last_addr_extract_at);
