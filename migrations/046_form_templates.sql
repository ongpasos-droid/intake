-- Form templates system: links programs to form types, stores user-filled form data

CREATE TABLE IF NOT EXISTS form_templates (
  id          CHAR(36) PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  template_json LONGTEXT NOT NULL COMMENT 'Full JSON structure of the form',
  version     VARCHAR(20) DEFAULT '1.0',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS form_instances (
  id              CHAR(36) PRIMARY KEY,
  template_id     CHAR(36) NOT NULL,
  program_id      CHAR(36) NOT NULL,
  project_id      CHAR(36) DEFAULT NULL COMMENT 'Linked intake project, null if standalone',
  title           VARCHAR(300) DEFAULT NULL,
  status          ENUM('draft','in_progress','complete') DEFAULT 'draft',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES form_templates(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id)  REFERENCES intake_programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS form_field_values (
  id            CHAR(36) PRIMARY KEY,
  instance_id   CHAR(36) NOT NULL,
  field_id      VARCHAR(100) NOT NULL COMMENT 'Matches field id in template JSON',
  section_path  VARCHAR(200) DEFAULT NULL COMMENT 'e.g. sec_1.sec_1_1 or sec_4.wp_1',
  value_text    LONGTEXT DEFAULT NULL COMMENT 'For textarea/text fields',
  value_json    JSON DEFAULT NULL COMMENT 'For tables, arrays, structured data',
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_instance_field (instance_id, field_id, section_path),
  FOREIGN KEY (instance_id) REFERENCES form_instances(id) ON DELETE CASCADE
);

-- Seed the EACEA BB template
INSERT IGNORE INTO form_templates (id, name, slug, description, version, template_json)
VALUES (
  '00000000-0000-4000-b000-000000000001',
  'ERASMUS BB and LS Type II',
  'erasmus-bb-lsii',
  'Universal template for EACEA-managed calls (KA3, Capacity Building, LS Type II, etc.)',
  '2.0',
  'PLACEHOLDER'
);
