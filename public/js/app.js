/* ═══════════════════════════════════════════════════════════════
   App — SPA Router + Global State
   ═══════════════════════════════════════════════════════════════ */

const App = (() => {
  let currentUser = null;
  let currentRoute = 'dashboard';

  /* ── Load public config and init Google Sign-In ───────────── */
  async function loadConfig() {
    try {
      const res = await fetch('/v1/config');
      const { data } = await res.json();
      if (data?.googleClientId) {
        const el = document.getElementById('g_id_onload');
        if (el) el.setAttribute('data-client_id', data.googleClientId);
        if (window.google?.accounts?.id) {
          window.google.accounts.id.initialize({
            client_id: data.googleClientId,
            callback: Auth.handleGoogleResponse,
            auto_prompt: false,
          });
          window.google.accounts.id.renderButton(
            document.querySelector('.g_id_signin'),
            { type: 'standard', shape: 'rectangular', theme: 'outline',
              text: 'continue_with', size: 'large', width: 360 }
          );
        }
      }
    } catch (e) {
      console.warn('Config load failed:', e.message);
    }
  }

  /* ── Initialize app ────────────────────────────────────────── */
  async function init() {
    await loadConfig();

    // Try to restore session from refresh token cookie
    const restored = await Auth.tryRestore();
    if (!restored) {
      showAuth();
    }

    // Listen for forced logout (e.g., expired refresh token)
    window.addEventListener('auth:logout', () => onLogout());

    // Handle browser back/forward
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1) || 'dashboard';
      if (currentUser) navigate(hash, false);
    });
  }

  /* ── Show auth screen ──────────────────────────────────────── */
  function showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-shell').classList.add('hidden');
    showAuthTab('login');

    // Show Google fallback if SDK didn't load
    setTimeout(() => {
      const gBtn = document.querySelector('.g_id_signin');
      if (!gBtn || gBtn.children.length === 0) {
        const fb = document.getElementById('google-fallback-btn');
        if (fb) fb.classList.remove('hidden');
      }
    }, 2000);
  }

  /* ── Show app shell ────────────────────────────────────────── */
  function showApp() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-shell').classList.remove('hidden');
    updateUserUI();

    // Navigate to hash or default
    const hash = location.hash.slice(1) || 'dashboard';
    navigate(hash, false);
  }

  /* ── Auth callbacks ────────────────────────────────────────── */
  function onAuth(user) {
    currentUser = user;
    showApp();
    Toast.show(`Welcome, ${user.name}!`, 'ok');
  }

  function onLogout() {
    currentUser = null;
    showAuth();
  }

  /* ── Update user info in sidebar ───────────────────────────── */
  function updateUserUI() {
    if (!currentUser) return;
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-email').textContent = currentUser.email;

    // Avatar initials
    const initials = currentUser.name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    document.getElementById('user-avatar').textContent = initials;

    // Show admin nav only for admins
    if (currentUser.role === 'admin') {
      document.getElementById('admin-nav-item')?.classList.remove('hidden');
    }
  }

  /* ── Auth tab switcher ─────────────────────────────────────── */
  function showAuthTab(tab) {
    const loginForm  = document.getElementById('form-login');
    const regForm    = document.getElementById('form-register');
    const tabLogin   = document.getElementById('tab-login');
    const tabReg     = document.getElementById('tab-register');

    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      regForm.classList.add('hidden');
      tabLogin.classList.add('text-primary', 'border-secondary-fixed');
      tabLogin.classList.remove('text-on-surface-variant', 'border-transparent');
      tabReg.classList.remove('text-primary', 'border-secondary-fixed');
      tabReg.classList.add('text-on-surface-variant', 'border-transparent');
    } else {
      regForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
      tabReg.classList.add('text-primary', 'border-secondary-fixed');
      tabReg.classList.remove('text-on-surface-variant', 'border-transparent');
      tabLogin.classList.remove('text-primary', 'border-secondary-fixed');
      tabLogin.classList.add('text-on-surface-variant', 'border-transparent');
    }
  }

  /* ── SPA Navigation ────────────────────────────────────────── */
  function navigate(route, pushHash = true, newProject = false) {
    currentRoute = route;

    // Update URL hash
    if (pushHash) location.hash = route;

    // Update panels
    document.querySelectorAll('#content-area .panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById(`panel-${route}`);
    if (panel) {
      panel.classList.add('active');
    } else {
      // Default to dashboard if panel doesn't exist
      const dash = document.getElementById('panel-dashboard');
      if (dash) dash.classList.add('active');
    }

    // Update sidebar active link
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.dataset.route === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Update topbar title
    const titles = {
      dashboard:  'Dashboard',
      intake:     'Intake',
      calculator: 'Calculator',
      planner:    'Planner',
      developer:  'Developer',
      evaluator:  'Evaluator',
      partners:   'Partners',
      admin:      'Admin — Data E+'
    };
    document.getElementById('topbar-title').textContent = titles[route] || 'E+ Tools';

    // Initialize module when navigating to it
    if (route === 'intake' && typeof Intake !== 'undefined') {
      if (newProject) {
        Intake.startNew();
      } else {
        Intake.init();
      }
    }
    if (route === 'admin' && typeof Admin !== 'undefined') Admin.init();
  }

  /* ── Toggle sidebar (mobile) ───────────────────────────────── */
  function toggleSidebar(forceClose) {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebar-overlay');
    const isOpen   = sidebar.classList.contains('open');
    const open     = forceClose ? false : !isOpen;
    sidebar.classList.toggle('open', open);
    overlay?.classList.toggle('show', open);
  }

  /* ── Public API ────────────────────────────────────────────── */
  return { init, onAuth, onLogout, showAuthTab, navigate, toggleSidebar };
})();


/* ═══════════════════════════════════════════════════════════════
   Toast — Simple notification system
   ═══════════════════════════════════════════════════════════════ */

const Toast = (() => {
  let timer = null;

  function show(msg, type = 'ok') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `show ${type}`;
    clearTimeout(timer);
    timer = setTimeout(() => { el.className = '' }, 4000);
  }

  return { show };
})();


/* ═══ Boot ═════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  App.init();

  /* ── Auth tab buttons ─────────────────────────────────────── */
  document.getElementById('tab-login')?.addEventListener('click', () => App.showAuthTab('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => App.showAuthTab('register'));

  /* ── Auth forms ───────────────────────────────────────────── */
  document.getElementById('form-login')?.addEventListener('submit', (e) => Auth.login(e));
  document.getElementById('form-register')?.addEventListener('submit', (e) => Auth.register(e));

  /* ── Google fallback ──────────────────────────────────────── */
  document.getElementById('google-fallback-btn')?.addEventListener('click', () => {
    alert('Google Sign-In will be available once the Client ID is configured.');
  });

  /* ── Sidebar nav links ────────────────────────────────────── */
  document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const route = link.dataset.route;
      if (route) App.navigate(route);
    });
  });

  /* ── Logout button ────────────────────────────────────────── */
  document.getElementById('btn-logout')?.addEventListener('click', () => Auth.logout());

  /* ── Mobile sidebar toggle ────────────────────────────────── */
  document.getElementById('btn-toggle-sidebar')?.addEventListener('click', () => App.toggleSidebar());
  document.getElementById('sidebar-overlay')?.addEventListener('click', () => App.toggleSidebar(true));

  /* ── Close sidebar on nav link click (mobile) ──────────────── */
  document.querySelectorAll('#sidebar-nav .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 1024) App.toggleSidebar(true);
    });
  });

  /* ── Dashboard "Create New Project" button ─────────────────── */
  document.getElementById('btn-new-project')?.addEventListener('click', () => {
    App.navigate('intake', true, true);
  });
});
