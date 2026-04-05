/* ── Documents Controller ─────────────────────────────────────── */
const m = require('./model');
const path = require('path');

const ok  = (res, data) => res.json({ ok: true, data });
const err = (res, msg, status = 400) =>
  res.status(status).json({ ok: false, error: { message: msg } });

function parseTags(raw) {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch (_) {}
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}

const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

/* ── My Documents (user private) ────────────────���────────────── */

exports.listMyDocs = async (req, res) => {
  try {
    const docs = await m.listDocuments({ ownerType: 'user_private', ownerId: req.user.id });
    ok(res, docs);
  } catch (e) { err(res, e.message, 500); }
};

exports.uploadMyDoc = async (req, res) => {
  try {
    if (!req.file) return err(res, 'No file provided');
    if (!ALLOWED_TYPES.includes(req.file.mimetype)) return err(res, 'File type not allowed');
    if (req.file.size > MAX_SIZE) return err(res, 'File too large (max 20MB)');

    const ext = path.extname(req.file.originalname);
    const storagePath = `users/${req.user.id}/${Date.now()}${ext}`;

    await m.uploadFile('documents', storagePath, req.file.buffer, req.file.mimetype);

    const doc = await m.createDocument({
      owner_type: 'user_private',
      owner_id: req.user.id,
      title: req.body.title || req.file.originalname,
      description: req.body.description || null,
      file_type: req.file.mimetype,
      file_size_bytes: req.file.size,
      storage_bucket: 'documents',
      storage_path: storagePath,
      tags: parseTags(req.body.tags),
    });

    ok(res, doc);
  } catch (e) { err(res, e.message, 500); }
};

exports.updateMyDoc = async (req, res) => {
  try {
    const doc = await m.getDocument(req.params.id);
    if (!doc || doc.owner_id !== req.user.id) return err(res, 'Not found', 404);

    const fields = {};
    if (req.body.title !== undefined) fields.title = req.body.title;
    if (req.body.description !== undefined) fields.description = req.body.description;
    if (req.body.tags !== undefined) fields.tags = req.body.tags;

    ok(res, await m.updateDocument(req.params.id, fields));
  } catch (e) { err(res, e.message, 500); }
};

exports.deleteMyDoc = async (req, res) => {
  try {
    const doc = await m.getDocument(req.params.id);
    if (!doc || doc.owner_id !== req.user.id) return err(res, 'Not found', 404);

    await m.deleteDocument(req.params.id);
    ok(res, null);
  } catch (e) { err(res, e.message, 500); }
};

/* ── Official Documents (admin only) ─────────────────────────── */

exports.listOfficialDocs = async (req, res) => {
  try {
    const docs = await m.listDocuments({ ownerType: 'platform' });
    ok(res, docs);
  } catch (e) { err(res, e.message, 500); }
};

exports.uploadOfficialDoc = async (req, res) => {
  try {
    if (!req.file) return err(res, 'No file provided');

    const ext = path.extname(req.file.originalname);
    const storagePath = `platform/${Date.now()}${ext}`;

    await m.uploadFile('documents', storagePath, req.file.buffer, req.file.mimetype);

    const doc = await m.createDocument({
      owner_type: 'platform',
      owner_id: null,
      title: req.body.title || req.file.originalname,
      description: req.body.description || null,
      file_type: req.file.mimetype,
      file_size_bytes: req.file.size,
      storage_bucket: 'documents',
      storage_path: storagePath,
      tags: parseTags(req.body.tags),
    });

    // Link to program if provided
    if (req.body.program_id) {
      await m.linkDocumentToProgram(doc.id, req.body.program_id);
    }

    ok(res, doc);
  } catch (e) { err(res, e.message, 500); }
};

exports.deleteOfficialDoc = async (req, res) => {
  try {
    const doc = await m.getDocument(req.params.id);
    if (!doc || doc.owner_type !== 'platform') return err(res, 'Not found', 404);

    await m.deleteDocument(req.params.id);
    ok(res, null);
  } catch (e) { err(res, e.message, 500); }
};

/* ── Document ↔ Program links (admin) ─────────────────────���──── */

exports.getDocsByProgram = async (req, res) => {
  try {
    ok(res, await m.getDocumentsByProgram(req.params.programId));
  } catch (e) { err(res, e.message, 500); }
};

exports.linkToProgram = async (req, res) => {
  try {
    ok(res, await m.linkDocumentToProgram(req.body.document_id, req.params.programId));
  } catch (e) { err(res, e.message, 500); }
};

exports.unlinkFromProgram = async (req, res) => {
  try {
    await m.unlinkDocumentFromProgram(req.params.docId, req.params.programId);
    ok(res, null);
  } catch (e) { err(res, e.message, 500); }
};

/* ── Document ↔ Project links (user) ─────────────────────────── */

exports.getProjectDocs = async (req, res) => {
  try {
    ok(res, await m.getProjectDocuments(req.params.projectId));
  } catch (e) { err(res, e.message, 500); }
};

exports.linkToProject = async (req, res) => {
  try {
    ok(res, await m.linkDocumentToProject({
      projectId: req.params.projectId,
      documentId: req.body.document_id,
      source: req.body.source || 'user',
      addedBy: req.user.id,
    }));
  } catch (e) { err(res, e.message, 500); }
};

exports.unlinkFromProject = async (req, res) => {
  try {
    await m.unlinkDocumentFromProject(req.params.projectId, req.params.docId);
    ok(res, null);
  } catch (e) { err(res, e.message, 500); }
};
