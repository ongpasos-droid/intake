/* ── Admin Routes — /v1/admin/* ──────────────────────────────── */
const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

/* ── Admin guard middleware ───────────────────────────────────── */
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin only' } });
  }
  next();
}

const guard = [requireAuth, requireAdmin];

/* ── Convocatorias (intake_programs) ─────────────────────────── */
router.get   ('/data/programs',        guard, ctrl.listPrograms);
router.post  ('/data/programs',        guard, ctrl.upsertProgram);
router.patch ('/data/programs/:id',    guard, ctrl.upsertProgram);
router.delete('/data/programs/:id',    guard, ctrl.deleteProgram);

/* ── Países ───────────────────────────────────────────────────── */
router.get   ('/data/countries',       guard, ctrl.listCountries);
router.post  ('/data/countries',       guard, ctrl.upsertCountry);
router.patch ('/data/countries/:id',   guard, ctrl.upsertCountry);
router.delete('/data/countries/:id',   guard, ctrl.deleteCountry);

/* ── Tarifas per diem ─────────────────────────────────────────── */
router.get   ('/data/perdiem',         guard, ctrl.listPerdiem);
router.post  ('/data/perdiem',         guard, ctrl.upsertPerdiem);
router.patch ('/data/perdiem/:id',     guard, ctrl.upsertPerdiem);
router.delete('/data/perdiem/:id',     guard, ctrl.deletePerdiem);

/* ── Categorías de personal ───────────────────────────────────── */
router.get   ('/data/workers',         guard, ctrl.listWorkers);
router.post  ('/data/workers',         guard, ctrl.upsertWorker);
router.patch ('/data/workers/:id',     guard, ctrl.upsertWorker);
router.delete('/data/workers/:id',     guard, ctrl.deleteWorker);

/* ── Entidades ───────────────────────────────────────────────── */
router.get   ('/data/entities',        guard, ctrl.listEntities);
router.post  ('/data/entities',        guard, ctrl.upsertEntity);
router.patch ('/data/entities/:id',    guard, ctrl.upsertEntity);
router.delete('/data/entities/:id',    guard, ctrl.deleteEntity);

/* ── Worker matrix ───────────────────────────────────────────── */
router.get  ('/data/workers/matrix',       guard, ctrl.listWorkerMatrix);
router.patch('/data/workers/zone/:id',     guard, ctrl.upsertWorkerZoneRate);

/* ── Elegibilidad Erasmus+ ────────────────────────────────────── */
router.get('/data/eligibility',        guard, ctrl.listEligibility);
router.get('/data/eligibility/regions',guard, ctrl.listRegions);

module.exports = router;
