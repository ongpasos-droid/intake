/* ═══════════════════════════════════════════════════════════════
   API Client — HTTP helper for communicating with Node backend
   ═══════════════════════════════════════════════════════════════ */

const API = (() => {
  const BASE = '/v1';
  let accessToken = null;

  function setToken(token) { accessToken = token }
  function getToken()      { return accessToken }
  function clearToken()    { accessToken = null }

  async function request(method, path, body, opts = {}) {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken && !opts.noAuth) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const config = { method, headers, credentials: 'include' };
    if (body && method !== 'GET') config.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(url, config);
    } catch (err) {
      throw { code: 'NETWORK_ERROR', message: 'Cannot reach the server' };
    }

    // Auto-refresh on 401
    if (res.status === 401 && accessToken && !opts._retried) {
      const refreshed = await tryRefresh();
      if (refreshed) return request(method, path, body, { ...opts, _retried: true });
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
      throw { code: 'UNAUTHORIZED', message: 'Session expired' };
    }

    const json = await res.json();
    if (!json.ok) throw json.error || { code: 'UNKNOWN', message: 'Request failed' };
    return json.data;
  }

  async function tryRefresh() {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
      const json = await res.json();
      if (json.ok && json.data.access_token) {
        accessToken = json.data.access_token;
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  const get   = (path, opts)       => request('GET',    path, null, opts);
  const post  = (path, body, opts) => request('POST',   path, body, opts);
  const patch = (path, body, opts) => request('PATCH',  path, body, opts);
  const put   = (path, body, opts) => request('PUT',    path, body, opts);
  const del   = (path, opts)       => request('DELETE', path, null, opts);

  /* ── Proactive refresh: renew token every 45 min ──────────── */
  let refreshTimer = null;

  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(async () => {
      if (!accessToken) return stopAutoRefresh();
      await tryRefresh();
    }, 45 * 60 * 1000); // 45 minutes
  }

  function stopAutoRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  return { setToken, getToken, clearToken, get, post, patch, put, del, tryRefresh, startAutoRefresh, stopAutoRefresh };
})();
