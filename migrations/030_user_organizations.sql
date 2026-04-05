-- Migration 030: Support multiple organizations per user
-- Junction table user_organizations replaces users.organization_id

CREATE TABLE IF NOT EXISTS user_organizations (
  id           CHAR(36) PRIMARY KEY,
  user_id      CHAR(36) NOT NULL,
  organization_id CHAR(36) NOT NULL,
  role         VARCHAR(50) DEFAULT 'owner',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_org (user_id, organization_id)
);

-- Migrate existing data: copy users.organization_id into junction table
INSERT IGNORE INTO user_organizations (id, user_id, organization_id, role)
SELECT UUID(), id, organization_id, 'owner'
FROM users
WHERE organization_id IS NOT NULL;
