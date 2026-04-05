/* ── Documents Model — Supabase ────────────────────────────���─── */
const supabase = require('../../utils/supabase');

/* ── Documents CRUD ──────────────────────────────────────────── */

/** List documents by owner (platform docs or user private docs) */
async function listDocuments({ ownerType, ownerId, status = 'active' }) {
  let q = supabase
    .from('documents')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (ownerType) q = q.eq('owner_type', ownerType);
  if (ownerId)   q = q.eq('owner_id', ownerId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

/** Get single document by id */
async function getDocument(id) {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Create a new document record */
async function createDocument(doc) {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Update document metadata */
async function updateDocument(id, fields) {
  fields.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('documents')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/** Soft-delete a document */
async function deleteDocument(id) {
  const { error } = await supabase
    .from('documents')
    .update({ status: 'deleted', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/* ── Document ↔ Program links ────────────────────────────────── */

async function linkDocumentToProgram(documentId, programId) {
  const { data, error } = await supabase
    .from('document_programs')
    .upsert({ document_id: documentId, program_id: programId }, { onConflict: 'document_id,program_id' })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function unlinkDocumentFromProgram(documentId, programId) {
  const { error } = await supabase
    .from('document_programs')
    .delete()
    .eq('document_id', documentId)
    .eq('program_id', programId);
  if (error) throw new Error(error.message);
}

async function getDocumentsByProgram(programId) {
  const { data, error } = await supabase
    .from('document_programs')
    .select('document_id, documents(*)')
    .eq('program_id', programId);
  if (error) throw new Error(error.message);
  return data.map(r => r.documents);
}

/* ── Document ↔ Project links ────────────────────────────────── */

async function linkDocumentToProject({ projectId, documentId, source, addedBy }) {
  const { data, error } = await supabase
    .from('project_documents')
    .upsert(
      { project_id: projectId, document_id: documentId, source, added_by: addedBy },
      { onConflict: 'project_id,document_id' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function unlinkDocumentFromProject(projectId, documentId) {
  const { error } = await supabase
    .from('project_documents')
    .delete()
    .eq('project_id', projectId)
    .eq('document_id', documentId);
  if (error) throw new Error(error.message);
}

async function getProjectDocuments(projectId) {
  const { data, error } = await supabase
    .from('project_documents')
    .select('source, added_at, documents(*)')
    .eq('project_id', projectId)
    .order('added_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(r => ({ ...r.documents, source: r.source, added_at: r.added_at }));
}

/* ── File upload to Supabase Storage ─────────────────────────── */

async function uploadFile(bucket, path, buffer, contentType) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw new Error(error.message);
  return data.path;
}

async function deleteFile(bucket, path) {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);
  if (error) throw new Error(error.message);
}

module.exports = {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  linkDocumentToProgram,
  unlinkDocumentFromProgram,
  getDocumentsByProgram,
  linkDocumentToProject,
  unlinkDocumentFromProject,
  getProjectDocuments,
  uploadFile,
  deleteFile,
};
