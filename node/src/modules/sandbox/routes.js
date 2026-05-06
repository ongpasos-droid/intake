/* ── Sandbox Routes — /v1/sandbox/* ─────────────────────────────────── */

const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

router.post('/start',         requireAuth, ctrl.startSandbox);
router.post('/graduate/:id',  requireAuth, ctrl.graduateSandbox);

module.exports = router;
