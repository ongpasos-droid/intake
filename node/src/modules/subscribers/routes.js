/* ── Subscribers Routes — /v1/subscribers/* ─────────────────────────── */

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

// 5 signups per minute per IP is enough to stop spam but not real humans.
const subscribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts, try later.' } },
});

router.post('/', subscribeLimiter, ctrl.subscribe);
router.get('/',  requireAuth,     ctrl.list);

module.exports = router;
