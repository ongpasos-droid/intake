-- ═══════════════════════════════════════════════════════════════
-- Migration 077: Add Erasmus+ OID to organizations
-- ═══════════════════════════════════════════════════════════════
-- OID = Organisation ID assigned by the Erasmus+ Organisation
-- Registration System (e.g. "E10175142"). Separate from PIC and
-- from the national_id (CIF/NIF/VAT). Precargado desde el lookup
-- ORS al dar de alta una organización.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE organizations ADD COLUMN oid VARCHAR(20) DEFAULT NULL;
CREATE INDEX idx_organizations_oid ON organizations (oid);
