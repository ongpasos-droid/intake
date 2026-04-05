/* ═══════════════════════════════════════════════════════════════
   E+ Tools — Express Server (Entry Point)
   Single process, all modules under /v1/{module}/
   ═══════════════════════════════════════════════════════════════ */

require('dotenv').config();

const express  = require('express');
const helmet   = require('helmet');
const cors     = require('cors');
const path     = require('path');
const cookieParser = require('cookie-parser');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Trust proxy (behind Nginx/Caddy) ─────────────────────────── */
app.set('trust proxy', 1);

/* ── Security ─────────────────────────────────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:    ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://accounts.google.com", "https://apis.google.com"],
      scriptSrcAttr:["'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "https:"],
      connectSrc:  ["'self'", "https://accounts.google.com"],
      frameSrc:    ["https://accounts.google.com"],
    }
  }
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

/* ── Body parsing ─────────────────────────────────────────────── */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

/* ── Static files (SPA) ──────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── API Routes ───────────────────────────────────────────────── */
app.use('/v1/auth', require('./node/src/modules/auth/routes'));
app.use('/v1/intake', require('./node/src/modules/intake/routes'));
app.use('/v1/calculator', require('./node/src/modules/calculator/routes'));
app.use('/v1/admin', require('./node/src/modules/admin/routes'));
app.use('/v1/documents', require('./node/src/modules/documents/routes'));
app.use('/v1/organizations', require('./node/src/modules/organizations/routes'));
app.use('/v1/research', require('./node/src/modules/research/routes'));

// Future modules:
// app.use('/v1/planner',     require('./node/src/modules/planner/routes'));
// app.use('/v1/developer',   require('./node/src/modules/developer/routes'));
// app.use('/v1/evaluator',   require('./node/src/modules/evaluator/routes'));

/* ── SPA fallback — serve index.html for all non-API routes ─── */
app.get('*', (req, res) => {
  if (req.path.startsWith('/v1/')) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ── Global error handler ─────────────────────────────────────── */
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    ok: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Something went wrong'
        : err.message
    }
  });
});

/* ── Start ────────────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`[E+ Tools] Server running on port ${PORT}`);
});
