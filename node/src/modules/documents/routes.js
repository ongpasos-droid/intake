/* ── Documents Routes — /v1/documents/* ───────────────────────── */
const router = require('express').Router();
const multer  = require('multer');
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

/* ── Admin guard ─────────────────────────────────────────────── */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin only' } });
  }
  next();
}

/* ── Admin: all documents ────────────────────────────────────── */
router.get   ('/admin/all',  requireAuth, requireAdmin, ctrl.listAllDocs);

/* ── Semantic Search ─────────────────────────────────────────── */
router.post  ('/search',     requireAuth, ctrl.searchDocuments);

/* ── Download ────────────────────────────────────────────────── */
router.get   ('/download/:id', requireAuth, ctrl.downloadDoc);

/* ── My Documents (user private) ─────────────────────────────── */
router.get   ('/my',         requireAuth, ctrl.listMyDocs);
router.post  ('/my',         requireAuth, upload.single('file'), ctrl.uploadMyDoc);
router.patch ('/my/:id',     requireAuth, ctrl.updateMyDoc);
router.delete('/my/:id',     requireAuth, ctrl.deleteMyDoc);

/* ── Official Documents (admin) ──────────────────────────────── */
router.get   ('/official',             requireAuth, ctrl.listOfficialDocs);
router.post  ('/official',             requireAuth, requireAdmin, upload.single('file'), ctrl.uploadOfficialDoc);
router.delete('/official/:id',         requireAuth, requireAdmin, ctrl.deleteOfficialDoc);

/* ── Document ↔ Program (admin) ──────────────────────────────── */
router.get   ('/programs/:programId',            requireAuth, ctrl.getDocsByProgram);
router.post  ('/programs/:programId/link',       requireAuth, requireAdmin, ctrl.linkToProgram);
router.delete('/programs/:programId/:docId',     requireAuth, requireAdmin, ctrl.unlinkFromProgram);

/* ── Document ↔ Project (user) ───────────────────────────────── */
router.get   ('/projects/:projectId',            requireAuth, ctrl.getProjectDocs);
router.post  ('/projects/:projectId/link',       requireAuth, ctrl.linkToProject);
router.delete('/projects/:projectId/:docId',     requireAuth, ctrl.unlinkFromProject);

module.exports = router;
