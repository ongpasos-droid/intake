/* ── Organizations Routes — /v1/organizations/* ──────────────── */
const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

const auth = [requireAuth];

/* ── My organization ─────────────────────────────────────────── */
router.get ('/mine',      auth, ctrl.getMyOrg);
router.get ('/mine/all',  auth, ctrl.getMyOrgs);
router.put ('/mine',      auth, ctrl.upsertMyOrg);

/* ── Directory ───────────────────────────────────────────────── */
router.get ('/',      auth, ctrl.listOrgs);
router.get ('/:id',   auth, ctrl.getOrg);

/* ── Child resources (accreditations, eu-projects, key-staff, stakeholders, associated-partners) */
router.get   ('/:orgId/:type',      auth, ctrl.listChildren);
router.post  ('/:orgId/:type',      auth, ctrl.addChild);
router.patch ('/:orgId/:type/:id',  auth, ctrl.updateChild);
router.delete('/:orgId/:type/:id',  auth, ctrl.deleteChild);

module.exports = router;
