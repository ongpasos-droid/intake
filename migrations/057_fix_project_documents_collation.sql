-- Fix collation mismatch on project_documents (was utf8mb4_0900_ai_ci, should be utf8mb4_unicode_ci)
ALTER TABLE project_documents
  MODIFY project_id VARCHAR(36) NOT NULL COLLATE utf8mb4_unicode_ci,
  MODIFY source VARCHAR(20) DEFAULT 'user' COLLATE utf8mb4_unicode_ci;
