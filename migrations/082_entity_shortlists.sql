-- ── Entity shortlists (Partner Engine — favoritos del usuario) ────
-- Permite que cada user guarde colecciones de entidades del atlas Erasmus+
-- como pool de partners para futuras propuestas.
--
-- Decisión de diseño: NO hay FK desde items.oid hacia entities.oid porque
-- la tabla entities puede recargarse periódicamente desde el crawler ORS y
-- no queremos perder shortlists si un OID temporalmente desaparece.

CREATE TABLE IF NOT EXISTS entity_shortlists (
  id          CHAR(36)     NOT NULL,
  user_id     CHAR(36)     NOT NULL,
  name        VARCHAR(120) NOT NULL,
  description TEXT         NULL,
  is_default  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_shortlist_user    (user_id),
  KEY idx_shortlist_default (user_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS entity_shortlist_items (
  shortlist_id CHAR(36)    NOT NULL,
  oid          VARCHAR(15) NOT NULL,
  notes        TEXT        NULL,
  added_at     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (shortlist_id, oid),
  KEY idx_item_oid (oid),
  CONSTRAINT fk_shortlist_item_parent
    FOREIGN KEY (shortlist_id) REFERENCES entity_shortlists(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
