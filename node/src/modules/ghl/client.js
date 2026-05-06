/* ── GHL / centralize.es client ─────────────────────────────────────── */
/*
 * Thin HTTP client for the LeadConnector v2 API used by both
 * GoHighLevel official (services.leadconnectorhq.com) and white-label
 * resellers (centralize.es, etc.) — they share the same backend.
 *
 * Configuration (.env):
 *   GHL_API_BASE     default https://services.leadconnectorhq.com
 *   GHL_API_KEY      Private Integration token (Bearer)
 *   GHL_LOCATION_ID  sub-account / location ID
 *   GHL_DISABLED     'true' to no-op all calls (useful in tests)
 *   GHL_API_VERSION  default 2021-07-28
 *
 * If GHL_API_KEY or GHL_LOCATION_ID are missing, the client returns
 * { ok: false, skipped: true } and never throws — keeps callers simple.
 */

const BASE_URL_DEFAULT = 'https://services.leadconnectorhq.com';
const API_VERSION_DEFAULT = '2021-07-28';

function isEnabled() {
  if (process.env.GHL_DISABLED === 'true') return false;
  if (!process.env.GHL_API_KEY) return false;
  if (!process.env.GHL_LOCATION_ID) return false;
  return true;
}

function baseUrl() {
  return (process.env.GHL_API_BASE || BASE_URL_DEFAULT).replace(/\/+$/, '');
}

function defaultHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
    'Version':       process.env.GHL_API_VERSION || API_VERSION_DEFAULT,
    'Content-Type':  'application/json',
    'Accept':        'application/json',
  };
}

/**
 * Low-level request. Returns { ok, status, data, error?, skipped? }.
 * Never throws — caller treats failures as warnings.
 */
async function request(method, path, body = null) {
  if (!isEnabled()) {
    return { ok: false, skipped: true, reason: 'GHL not configured' };
  }
  const url = baseUrl() + (path.startsWith('/') ? path : '/' + path);
  try {
    const res = await fetch(url, {
      method,
      headers: defaultHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch { /* non-json */ }
    if (!res.ok) {
      return { ok: false, status: res.status, data, error: data?.message || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

module.exports = { request, isEnabled };
