/* ── Admin Controller ─────────────────────────────────────────── */
const m = require('./model');

const ok  = (res, data) => res.json({ ok: true, data });
const err = (res, msg, status = 400) =>
  res.status(status).json({ ok: false, error: { message: msg } });

/* ── Programs ─────────────────────────────────────────────────── */
exports.listPrograms    = async (req, res) => { try { ok(res, await m.listPrograms()); } catch(e) { err(res, e.message, 500); } };
exports.upsertProgram   = async (req, res) => { try { const id = await m.upsertProgram(req.body, req.params.id || null); ok(res, { id }); } catch(e) { err(res, e.message, 500); } };
exports.deleteProgram   = async (req, res) => { try { await m.deleteProgram(req.params.id); ok(res, null); } catch(e) { err(res, e.message, 500); } };

/* ── Countries ────────────────────────────────────────────────── */
exports.listCountries   = async (req, res) => { try { ok(res, await m.listCountries()); } catch(e) { err(res, e.message, 500); } };
exports.upsertCountry   = async (req, res) => { try { const id = await m.upsertCountry(req.body, req.params.id || null); ok(res, { id }); } catch(e) { err(res, e.message, 500); } };
exports.deleteCountry   = async (req, res) => { try { await m.deleteCountry(req.params.id); ok(res, null); } catch(e) { err(res, e.message, 500); } };

/* ── Per diem rates ───────────────────────────────────────────── */
exports.listPerdiem     = async (req, res) => { try { ok(res, await m.listPerdiem()); } catch(e) { err(res, e.message, 500); } };
exports.upsertPerdiem   = async (req, res) => { try { const id = await m.upsertPerdiem(req.body, req.params.id || null); ok(res, { id }); } catch(e) { err(res, e.message, 500); } };
exports.deletePerdiem   = async (req, res) => { try { await m.deletePerdiem(req.params.id); ok(res, null); } catch(e) { err(res, e.message, 500); } };

/* ── Worker categories ────────────────────────────────────────── */
exports.listWorkers     = async (req, res) => { try { ok(res, await m.listWorkerCategories()); } catch(e) { err(res, e.message, 500); } };
exports.upsertWorker    = async (req, res) => { try { const id = await m.upsertWorkerCategory(req.body, req.params.id || null); ok(res, { id }); } catch(e) { err(res, e.message, 500); } };
exports.deleteWorker    = async (req, res) => { try { await m.deleteWorkerCategory(req.params.id); ok(res, null); } catch(e) { err(res, e.message, 500); } };

/* ── Eligibility (countries by region) ────────────────────────── */
exports.listEligibility = async (req, res) => {
  try {
    const { type, region } = req.query;
    ok(res, await m.listEligibility({ type, region }));
  } catch(e) { err(res, e.message, 500); }
};
exports.listRegions = async (req, res) => {
  try { ok(res, await m.listRegions()); } catch(e) { err(res, e.message, 500); }
};

/* ── Worker matrix ────────────────────────────────────────────── */
exports.listWorkerMatrix   = async (req, res) => { try { ok(res, await m.listWorkerMatrix()); } catch(e) { err(res, e.message, 500); } };
exports.upsertWorkerZoneRate = async (req, res) => { try { await m.upsertWorkerZoneRate(req.params.id, req.body.rate_day); ok(res, null); } catch(e) { err(res, e.message, 500); } };
