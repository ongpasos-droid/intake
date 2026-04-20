-- Make document_id nullable in document_chunks (research sources have source_id instead)
ALTER TABLE document_chunks MODIFY COLUMN document_id VARCHAR(36) NULL;
