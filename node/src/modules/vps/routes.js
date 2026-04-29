/* ── VPS Analytics Routes — /v1/vps/* (admin only, read-only) ── */
const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin only' } });
  }
  next();
}

const guard = [requireAuth, requireAdmin];

/* ── Health ─────────────────────────────────────────────────── */
router.get('/health',                guard, ctrl.health);

/* ── EACEA dashboards ───────────────────────────────────────── */
router.get('/eacea/families',        guard, ctrl.eaceaFamilies);
router.get('/eacea/overview',        guard, ctrl.eaceaOverview);
router.get('/eacea/by-country',      guard, ctrl.eaceaByCountry);
router.get('/eacea/timeline',        guard, ctrl.eaceaTimeline);
router.get('/eacea/top-coordinators',guard, ctrl.eaceaTopCoordinators);
router.get('/eacea/topics',          guard, ctrl.eaceaTopics);
router.get('/eacea/topic-trend',     guard, ctrl.eaceaTopicTrend);
router.get('/eacea/topic-winners',   guard, ctrl.eaceaTopicWinners);
router.get('/eacea/growth',          guard, ctrl.eaceaGrowth);
router.get('/eacea/writing',         guard, ctrl.eaceaWriting);
router.get('/eacea/network',         guard, ctrl.eaceaNetwork);
router.get('/eacea/bertopic',        guard, ctrl.eaceaBertopic);

/* ── Búsqueda semántica (proxy a microservicio Python) ──────── */
router.post('/eacea/similar',        guard, ctrl.eaceaSimilar);
router.get ('/eacea/similar/health', guard, ctrl.eaceaSimilarHealth);

module.exports = router;
