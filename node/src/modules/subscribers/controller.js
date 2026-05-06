/* ── Subscribers Controller — newsletter list endpoints ──────────────── */

const model = require('./model');

/**
 * POST /v1/subscribers
 * Public endpoint. Rate-limited at the router level.
 * Body: { email, source? }  → creates cold lead if new, no-op if exists.
 * Returns 201 on create, 200 on existing (same email-is-welcome shape).
 */
async function subscribe(req, res, next) {
  try {
    const { email, source } = req.body || {};
    if (!email) {
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'email is required' } });
    }

    const safeSource = /^[a-z0-9_-]{1,32}$/i.test(source || '') ? source : 'blog';

    const { subscriber, created } = await model.upsertSubscriber({
      email,
      source: safeSource,
      tag: 'cold',
      ip: req.ip || null,
      ua: (req.headers['user-agent'] || '').slice(0, 255) || null,
    });

    res.status(created ? 201 : 200).json({
      ok: true,
      data: { id: subscriber.id, email: subscriber.email, tag: subscriber.tag, created },
    });
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ ok: false, error: { code: err.code, message: err.message } });
    }
    next(err);
  }
}

/**
 * GET /v1/subscribers
 * Admin-only — requires req.user.role === 'admin'.
 * Query: tag, source, page, per_page.
 */
async function list(req, res, next) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Admin only' } });
    }
    const { tag, source, page, per_page } = req.query;
    const result = await model.listSubscribers({
      tag: tag || null,
      source: source || null,
      page: parseInt(page || '1', 10) || 1,
      perPage: parseInt(per_page || '50', 10) || 50,
    });
    res.json({ ok: true, data: result.data, meta: { total: result.total, page: result.page, per_page: result.per_page } });
  } catch (err) {
    next(err);
  }
}

module.exports = { subscribe, list };
