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
    // Retry hasta 2 veces en errores de red
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        res = await fetch(url, config);
        break;
      } catch (err) {
        if (attempt === 2) {
          throw { code: 'NETWORK_ERROR', message: 'No se puede conectar con el servidor. Comprueba tu conexión.' };
        }
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
      }
    }

    // Auto-refresh on 401
    if (res.status === 401 && accessToken && !opts._retried) {
      const refreshed = await tryRefresh();
      if (refreshed) return request(method, path, body, { ...opts, _retried: true });
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
      throw { code: 'UNAUTHORIZED', message: 'Sesión caducada, por favor inicia sesión de nuevo' };
    }

    const json = await res.json();
    if (!json.ok) throw json.error || { code: 'UNKNOWN', message: 'Error en la solicitud' };
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

  return { setToken, getToken, clearToken, get, post, patch, put, del, tryRefresh };
})();
