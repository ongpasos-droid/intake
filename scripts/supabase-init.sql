-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. documents: metadata de todos los documentos
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('platform', 'user_private', 'research_saved')),
  owner_id CHAR(36),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500),
  file_type VARCHAR(50),
  file_size_bytes INT,
  tags JSONB DEFAULT '[]',
  storage_bucket VARCHAR(100),
  storage_path VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'processing', 'error', 'deleted')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. document_chunks: texto extraido + embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  tokens INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. document_programs: doc oficial vinculado a call/programa
CREATE TABLE IF NOT EXISTS document_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  program_id CHAR(36) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, program_id)
);

-- 4. project_documents: doc vinculado a proyecto
CREATE TABLE IF NOT EXISTS project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id CHAR(36) NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL CHECK (source IN ('official', 'user', 'research')),
  added_by CHAR(36) NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, document_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_project_docs_project ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_document_programs_program ON document_programs(program_id);
