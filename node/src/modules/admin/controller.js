/* ── Admin Controller ─────────────────────────────────────────── */
const m = require('./model');
const wrap = require('../../utils/asyncHandler');

const ok  = (res, data) => res.json({ ok: true, data });

/* ── Programs ─────────────────────────────────────────────────── */
exports.listPrograms  = wrap(async (req, res) => { ok(res, await m.listPrograms()); });
exports.upsertProgram = wrap(async (req, res) => { ok(res, { id: await m.upsertProgram(req.body, req.params.id || null) }); });
exports.deleteProgram = wrap(async (req, res) => { await m.deleteProgram(req.params.id); ok(res, null); });

/* ── Countries ────────────────────────────────────────────────── */
exports.listCountries  = wrap(async (req, res) => { ok(res, await m.listCountries(req.query)); });
exports.upsertCountry  = wrap(async (req, res) => { ok(res, { id: await m.upsertCountry(req.body, req.params.id || null) }); });
exports.deleteCountry  = wrap(async (req, res) => { await m.deleteCountry(req.params.id); ok(res, null); });

/* ── Per diem rates ───────────────────────────────────────────── */
exports.listPerdiem   = wrap(async (req, res) => { ok(res, await m.listPerdiem()); });
exports.upsertPerdiem = wrap(async (req, res) => { ok(res, { id: await m.upsertPerdiem(req.body, req.params.id || null) }); });
exports.deletePerdiem = wrap(async (req, res) => { await m.deletePerdiem(req.params.id); ok(res, null); });

/* ── Worker categories ────────────────────────────────────────── */
exports.listWorkers   = wrap(async (req, res) => { ok(res, await m.listWorkerCategories()); });
exports.upsertWorker  = wrap(async (req, res) => { ok(res, { id: await m.upsertWorkerCategory(req.body, req.params.id || null) }); });
exports.deleteWorker  = wrap(async (req, res) => { await m.deleteWorkerCategory(req.params.id); ok(res, null); });

/* ── Worker matrix ────────────────────────────────────────────── */
exports.listWorkerMatrix    = wrap(async (req, res) => { ok(res, await m.listWorkerMatrix()); });
exports.upsertWorkerZoneRate = wrap(async (req, res) => { await m.upsertWorkerZoneRate(req.params.id, req.body.rate_day); ok(res, null); });

/* ── Eligibility (countries by region) ────────────────────────── */
exports.listEligibility = wrap(async (req, res) => {
  const { type, region } = req.query;
  ok(res, await m.listEligibility({ type, region }));
});
exports.listRegions = wrap(async (req, res) => { ok(res, await m.listRegions()); });
