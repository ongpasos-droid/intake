/* ═══════════════════════════════════════════════════════════════
   Auth — Login, Register, Google OAuth, Logout
   ═══════════════════════════════════════════════════════════════ */

const Auth = (() => {

  async function login(e) {
    e.preventDefault();
    clearError('login');
    setLoading('btn-login', true);
    try {
      const email    = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const data = await API.post('/auth/login', { email, password }, { noAuth: true });
      API.setToken(data.access_token);
      API.startAutoRefresh();
      App.onAuth(data.user);
    } catch (err) {
      showError('login', err.message || 'Login failed');
    } finally {
      setLoading('btn-login', false);
    }
  }

  async function register(e) {
    e.preventDefault();
    clearError('register');
    setLoading('btn-register', true);
    try {
      const name     = document.getElementById('reg-name').value;
      const email    = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-password').value;
      const data = await API.post('/auth/register', { name, email, password }, { noAuth: true });
      API.setToken(data.access_token);
      API.startAutoRefresh();
      App.onAuth(data.user);
    } catch (err) {
      showError('register', err.message || 'Registration failed');
    } finally {
      setLoading('btn-register', false);
    }
  }

  async function handleGoogleResponse(response) {
    try {
      const data = await API.post('/auth/google', { credential: response.credential }, { noAuth: true });
      API.setToken(data.access_token);
      API.startAutoRefresh();
      App.onAuth(data.user);
    } catch (err) {
      Toast.show(err.message || 'Google sign-in failed', 'err');
    }
  }

  async function logout() {
    API.stopAutoRefresh();
    try { await API.post('/auth/logout'); } catch { /* ignore */ }
    API.clearToken();
    App.onLogout();
  }

  async function tryRestore() {
    const refreshed = await API.tryRefresh();
    if (!refreshed) return false;
    try {
      const user = await API.get('/auth/me');
      API.startAutoRefresh();
      App.onAuth(user);
      return true;
    } catch {
      API.clearToken();
      return false;
    }
  }

  /* ── UI Helpers ────────────────────────────────────────────── */
  function showError(form, msg) {
    const el = document.getElementById(form === 'login' ? 'login-error' : 'reg-error');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function clearError(form) {
    const el = document.getElementById(form === 'login' ? 'login-error' : 'reg-error');
    el.textContent = '';
    el.classList.add('hidden');
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (loading) {
      btn.dataset.text = btn.textContent;
      btn.innerHTML = '<span class="spinner"></span>';
      btn.disabled = true;
    } else {
      btn.textContent = btn.dataset.text || btn.textContent;
      btn.disabled = false;
    }
  }

  return { login, register, handleGoogleResponse, logout, tryRestore };
})();

// Expose globally for Google SDK callback + HTML onclick
window.Auth = Auth;
