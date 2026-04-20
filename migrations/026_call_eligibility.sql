-- 026: Per-programme eligibility rules

CREATE TABLE IF NOT EXISTS call_eligibility (
  id                CHAR(36)    NOT NULL PRIMARY KEY,
  program_id        CHAR(36)    NOT NULL,
  eligible_country_types  JSON  DEFAULT NULL,
  eligible_entity_types   JSON  DEFAULT NULL,
  min_partners      INT         NOT NULL DEFAULT 1,
  min_countries     INT         NOT NULL DEFAULT 1,
  max_coord_applications INT    DEFAULT NULL,
  activity_location_types JSON  DEFAULT NULL,
  additional_rules  TEXT,
  updated_at        DATETIME    NOT NULL DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (program_id) REFERENCES intake_programs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE UNIQUE INDEX uq_call_elig_program ON call_eligibility (program_id);

-- Seed KA3 eligibility
INSERT IGNORE INTO call_eligibility (id, program_id, eligible_country_types, eligible_entity_types, min_partners, min_countries, max_coord_applications, activity_location_types, additional_rules)
SELECT UUID(),
  ip.id,
  '["eu_member","associated"]',
  '[{"type":"ngo","can_coordinate":true,"label":"NGO / Youth NGO"},{"type":"public_body","can_coordinate":true,"label":"Public body (local/regional/national)"},{"type":"university","can_coordinate":true,"label":"Education or research institution"},{"type":"foundation","can_coordinate":true,"label":"Foundation"},{"type":"for_profit","can_coordinate":false,"label":"For-profit organisation"}]',
  5, 5, 1,
  '["eu_member","associated"]',
  'Associated partners are allowed but do not count towards minimum eligibility criteria for consortium composition.'
FROM intake_programs ip
WHERE ip.action_type LIKE 'KA3%'
LIMIT 1;
