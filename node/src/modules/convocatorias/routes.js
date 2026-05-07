/* ── Convocatorias Routes — /v1/convocatorias/* ─────────────────────── */
const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

router.get('/',     requireAuth, ctrl.list);
router.get('/:id',  requireAuth, ctrl.getById);

module.exports = router;
