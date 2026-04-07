/* ═══════════════════════════════════════════════════════════════
   Intake — Wizard module for creating Erasmus+ project proposals
   Uses API module for authenticated requests to /v1/intake/*
   ═══════════════════════════════════════════════════════════════ */

const Intake = (() => {
  let initialized = false;
  let step = 0;
  let selectedProgram = null;
  let programs = [];
  let partners = [{ _local: 1, name: '', city: '', country: '', role: 'applicant', order_index: 1 }];
  let pCounter = 1;
  let currentProjectId = null;
  let calcInitialized = false;
  let calcNeedsReinit = false;

  /* ── Step configuration (9 steps) ───────────────────────────── */
  const STEPS = [
    { key: 'programa',     label: 'Programa',      icon: 'school',        panel: 'intake-p0' },
    { key: 'proyecto',     label: 'Proyecto',      icon: 'description',   panel: 'intake-p1' },
    { key: 'contexto',     label: 'Contexto',      icon: 'edit_note',     panel: 'intake-p2' },
    { key: 'tarifas',      label: 'Tarifas',       icon: 'euro',          panel: 'intake-dynamic', calc: 'rates' },
    { key: 'rutas',        label: 'Rutas',         icon: 'route',         panel: 'intake-dynamic', calc: 'routes' },
    { key: 'wps',          label: 'WPs',           icon: 'account_tree',  panel: 'intake-dynamic', calc: 'mergedWPs' },
    { key: 'presupuesto',  label: 'Budget',        icon: 'payments',      panel: 'intake-dynamic', calc: 'results' },
    { key: 'gantt',        label: 'Gantt',         icon: 'timeline',      panel: 'intake-dynamic', calc: 'gantt' },
    { key: 'resumen',      label: 'Resumen',       icon: 'summarize',     panel: 'intake-p3' },
  ];

  /* ── Word counter config ─────────────────────────────────────── */
  const WC = [
    { ta: 'intake-ctx-prob', bar: 'intake-wb-prob', badge: 'intake-wc-prob', min: 200, max: 500 },
    { ta: 'intake-ctx-tgt',  bar: 'intake-wb-tgt',  badge: 'intake-wc-tgt',  min: 150, max: 400 },
    { ta: 'intake-ctx-app',  bar: 'intake-wb-app',  badge: 'intake-wc-app',  min: 200, max: 500 },
  ];

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    if (initialized) {
      setStep(step);
      loadPrograms();
      return;
    }
    initialized = true;
    renderStepNav();
    bindEvents();
    setStep(0);
    loadPrograms();
  }

  function startNew() {
    init();
    resetForm();
    calcInitialized = false;
    calcNeedsReinit = false;
    setStep(0);
  }

  /* ── Dynamic step nav ───────────────────────────────────────── */
  function renderStepNav() {
    const nav = document.getElementById('intake-step-nav');
    if (!nav) return;
    nav.innerHTML = STEPS.map((s, i) => {
      const dot = `<div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-headline border-2 border-outline-variant bg-surface text-on-surface-variant transition-all" id="intake-sd${i}">${i + 1}</div>`;
      const lbl = `<span class="font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hidden sm:inline" id="intake-sl${i}">${s.label}</span>`;
      const step = `<div class="flex items-center gap-1.5 cursor-pointer intake-progress-step" data-step="${i}">${dot}${lbl}</div>`;
      const conn = i < STEPS.length - 1 ? `<div class="flex-1 h-px bg-outline-variant mx-1 transition-colors min-w-[8px]" id="intake-sc${i}"></div>` : '';
      return step + conn;
    }).join('');
  }

  /* ── Event binding ───────────────────────────────────────────── */
  function bindEvents() {
    // Step navigation (delegated since nav is dynamic)
    document.getElementById('intake-step-nav')?.addEventListener('click', (e) => {
      const stepEl = e.target.closest('[data-step]');
      if (!stepEl) return;
      const s = parseInt(stepEl.dataset.step);
      if (s <= step) setStep(s);
    });

    // Next/Prev buttons
    document.querySelectorAll('.intake-btn-next').forEach(btn => {
      btn.addEventListener('click', () => nextStep());
    });
    document.querySelectorAll('.intake-btn-prev').forEach(btn => {
      btn.addEventListener('click', () => setStep(step - 1));
    });

    // Add partner
    document.getElementById('intake-btn-add-partner')?.addEventListener('click', addPartner);

    // Word counters
    WC.forEach(c => {
      document.getElementById(c.ta)?.addEventListener('input', () => updateWC(c));
    });

    // Duration is now fixed from program data (hidden input)

    // Save/Load file buttons
    document.getElementById('intake-btn-save-file')?.addEventListener('click', saveToFile);
    document.getElementById('intake-btn-load-file')?.addEventListener('click', () => {
      document.getElementById('intake-file-in').click();
    });
    document.getElementById('intake-file-in')?.addEventListener('change', loadFromFile);

    // Server save buttons
    document.getElementById('intake-btn-save-server')?.addEventListener('click', saveToServer);
    document.getElementById('intake-btn-save-server-2')?.addEventListener('click', saveToServer);

    // Export wizard
    document.getElementById('intake-btn-export-wizard')?.addEventListener('click', exportWizard);
  }

  /* ── Programs ────────────────────────────────────────────────── */
  async function loadPrograms() {
    try {
      programs = await API.get('/intake/programs', { noAuth: true });
      renderProgramCards();
    } catch (err) {
      console.error('loadPrograms:', err);
    }
  }

  function renderProgramCards() {
    const list = document.getElementById('intake-prog-list');
    if (!list) return;

    list.innerHTML = programs.map((p, i) => `
      <div class="intake-prog-card flex items-center gap-3 p-4 rounded-xl border-2 ${i === 0 ? 'border-primary bg-white' : 'border-outline-variant bg-white'} cursor-pointer transition-all hover:shadow-md" data-idx="${i}">
        <div class="w-5 h-5 rounded-full border-2 ${i === 0 ? 'border-primary bg-primary' : 'border-outline-variant bg-surface'} flex items-center justify-center flex-shrink-0">
          ${i === 0 ? '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>' : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-headline text-base font-bold text-primary">${esc(p.name)}</div>
          <div class="text-xs text-on-surface-variant mt-0.5">${esc(p.action_type)}</div>
        </div>
        <span class="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-secondary-fixed/20 text-primary-container border border-secondary-fixed-dim/40">Disponible</span>
      </div>
    `).join('');

    // Bind click on cards
    list.querySelectorAll('.intake-prog-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx);
        selectProgram(idx);
      });
    });

    // Auto-select first
    if (programs.length > 0 && !selectedProgram) {
      selectProgram(0);
    }
  }

  function selectProgram(idx) {
    selectedProgram = programs[idx];
    const p = selectedProgram;

    // Update radio visual
    document.querySelectorAll('.intake-prog-card').forEach((card, i) => {
      const dot = card.querySelector('div > div:first-child');
      if (i === idx) {
        card.classList.remove('border-outline-variant'); card.classList.add('border-primary');
        dot.classList.remove('border-outline-variant', 'bg-surface'); dot.classList.add('border-primary', 'bg-primary');
        dot.innerHTML = '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>';
      } else {
        card.classList.add('border-outline-variant'); card.classList.remove('border-primary');
        dot.classList.add('border-outline-variant', 'bg-surface'); dot.classList.remove('border-primary', 'bg-primary');
        dot.innerHTML = '';
      }
    });

    // Show details
    document.getElementById('intake-prog-details').classList.remove('hidden');
    document.getElementById('intake-ro-dl').textContent = fmtDate(p.deadline);
    document.getElementById('intake-ro-gr').textContent = p.eu_grant_max ? Number(p.eu_grant_max).toLocaleString('es-ES') + ' \u20AC' : '\u2014';
    document.getElementById('intake-ro-co').textContent = p.cofin_pct ? p.cofin_pct + ' %' : '\u2014';
    document.getElementById('intake-ro-in').textContent = p.indirect_pct ? p.indirect_pct + ' %' : '\u2014';
    document.getElementById('intake-ro-sf').textContent = fmtDate(p.start_date_min);
    document.getElementById('intake-ro-st').textContent = fmtDate(p.start_date_max);

    // Set start date from program (fixed)
    const startInput = document.getElementById('intake-f-start');
    if (startInput) {
      startInput.value = toDateStr(p.start_date_min);
    }

    // Duration (fixed from program)
    const durHidden = document.getElementById('intake-f-dur');
    const durDisplay = document.getElementById('intake-ro-dur');
    if (p.duration_min_months && p.duration_max_months) {
      const dur = p.duration_max_months;
      if (durHidden) durHidden.value = dur;
      if (durDisplay) {
        durDisplay.textContent = p.duration_min_months === p.duration_max_months
          ? dur + ' meses'
          : p.duration_min_months + ' – ' + p.duration_max_months + ' meses';
      }
    }

    // Action type
    document.getElementById('intake-f-type').value = p.action_type || '';
  }

  /* ── Server projects ─────────────────────────────────────────── */
  async function loadServerProjects() {
    const el = document.getElementById('intake-server-projects');
    if (!el) return;
    try {
      const result = await API.get('/intake/projects');
      const projects = Array.isArray(result) ? result : (result.data || result);
      if (!projects || projects.length === 0) {
        el.innerHTML = '<p class="text-xs text-on-surface-variant">No hay proyectos guardados</p>';
        return;
      }
      el.innerHTML = projects.map(p => `
        <div class="flex items-center justify-between p-3 rounded-lg border border-outline-variant bg-white hover:border-primary cursor-pointer transition-all mb-1.5" data-project-id="${esc(p.id)}">
          <div>
            <span class="text-sm font-bold text-primary">${esc(p.name)}</span>
            <span class="text-xs text-on-surface-variant ml-2">${esc(p.type || '')} \u00B7 ${esc(p.status || '')}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-on-surface-variant">${fmtDate(toDateStr(p.updated_at || p.created_at))}</span>
            <button type="button" class="intake-delete-project text-on-surface-variant hover:text-error transition-colors" data-id="${esc(p.id)}" title="Eliminar">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        </div>
      `).join('');

      // Bind click to load
      el.querySelectorAll('[data-project-id]').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.intake-delete-project')) return;
          loadFromServer(card.dataset.projectId);
        });
      });

      // Bind delete
      el.querySelectorAll('.intake-delete-project').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteFromServer(btn.dataset.id);
        });
      });
    } catch (err) {
      console.error('loadServerProjects:', err);
      el.innerHTML = '<p class="text-xs text-on-surface-variant">Error al cargar proyectos</p>';
    }
  }

  async function loadFromServer(id, targetStep) {
    try {
      const project = await API.get('/intake/projects/' + id);
      currentProjectId = project.id;

      // Load project fields
      document.getElementById('intake-f-name').value = project.name || '';
      document.getElementById('intake-f-desc').value = project.description || '';
      document.getElementById('intake-f-start').value = toDateStr(project.start_date);
      document.getElementById('intake-f-type').value = project.type || '';

      if (project.duration_months) {
        const durSel = document.getElementById('intake-f-dur');
        for (const o of durSel.options) {
          if (o.value == project.duration_months) { o.selected = true; break; }
        }
      }

      // Select matching program
      if (project.type && programs.length) {
        const idx = programs.findIndex(p => p.action_type === project.type);
        if (idx >= 0) selectProgram(idx);
      }

      // Load partners
      try {
        const partnerList = await API.get('/intake/projects/' + id + '/partners');
        if (partnerList && partnerList.length > 0) {
          partners = partnerList.map(p => ({
            _server: p.id,
            _local: p.order_index,
            name: p.name || '',
            city: p.city || '',
            country: p.country || '',
            role: p.role || 'partner',
            order_index: p.order_index
          }));
          pCounter = partners.length;
        }
      } catch (e) { console.error('loadPartners:', e); }

      // Load context
      try {
        const contexts = await API.get('/intake/projects/' + id + '/context');
        if (contexts && contexts.length > 0) {
          const ctx = contexts[0];
          document.getElementById('intake-ctx-prob').value = ctx.problem || '';
          document.getElementById('intake-ctx-tgt').value = ctx.target_groups || '';
          document.getElementById('intake-ctx-app').value = ctx.approach || '';
          WC.forEach(c => updateWC(c));
        }
      } catch (e) { console.error('loadContexts:', e); }

      renderPartners();
      setStep(targetStep != null ? targetStep : 1);
      Toast.show('Proyecto cargado: ' + project.name, 'ok');
    } catch (err) {
      Toast.show('Error al cargar: ' + (err.message || err), 'err');
    }
  }

  async function deleteFromServer(id) {
    if (!confirm('\u00BFEliminar este proyecto del servidor?')) return;
    try {
      await API.del('/intake/projects/' + id);
      if (currentProjectId === id) currentProjectId = null;
      Toast.show('Proyecto eliminado', 'ok');
      loadServerProjects();
    } catch (err) {
      Toast.show('Error: ' + (err.message || err), 'err');
    }
  }

  async function saveToServer() {
    const name = document.getElementById('intake-f-name').value.trim();
    if (!name) { Toast.show('Escribe un nombre de proyecto', 'err'); return; }

    try {
      if (currentProjectId) {
        // Update existing
        await API.patch('/intake/projects/' + currentProjectId, {
          name,
          type: document.getElementById('intake-f-type').value || null,
          description: document.getElementById('intake-f-desc').value.trim() || null,
          start_date: document.getElementById('intake-f-start').value || null,
          duration_months: parseInt(document.getElementById('intake-f-dur').value) || null,
          eu_grant: selectedProgram ? Number(selectedProgram.eu_grant_max) : 0,
          cofin_pct: selectedProgram ? selectedProgram.cofin_pct : 0,
          indirect_pct: selectedProgram ? Number(selectedProgram.indirect_pct) : 0,
        });

        // Update context
        try {
          const contexts = await API.get('/intake/projects/' + currentProjectId + '/context');
          if (contexts && contexts.length > 0) {
            await API.patch('/intake/contexts/' + contexts[0].id, {
              problem: document.getElementById('intake-ctx-prob').value.trim(),
              target_groups: document.getElementById('intake-ctx-tgt').value.trim(),
              approach: document.getElementById('intake-ctx-app').value.trim(),
            });
          }
        } catch (e) { console.error('updateContext:', e); }

        Toast.show('Proyecto actualizado', 'ok');
      } else {
        // Create new
        const project = await API.post('/intake/projects', {
          name,
          type: document.getElementById('intake-f-type').value || null,
          description: document.getElementById('intake-f-desc').value.trim() || null,
          start_date: document.getElementById('intake-f-start').value || null,
          duration_months: parseInt(document.getElementById('intake-f-dur').value) || null,
          eu_grant: selectedProgram ? Number(selectedProgram.eu_grant_max) : 0,
          cofin_pct: selectedProgram ? selectedProgram.cofin_pct : 0,
          indirect_pct: selectedProgram ? Number(selectedProgram.indirect_pct) : 0,
        });
        currentProjectId = project.id;

        // Create partners
        for (const pt of partners) {
          if (pt.name) {
            await API.post('/intake/projects/' + currentProjectId + '/partners', {
              name: pt.name, city: pt.city, country: pt.country
            });
          }
        }

        // Update context
        try {
          const contexts = await API.get('/intake/projects/' + currentProjectId + '/context');
          if (contexts && contexts.length > 0) {
            await API.patch('/intake/contexts/' + contexts[0].id, {
              problem: document.getElementById('intake-ctx-prob').value.trim(),
              target_groups: document.getElementById('intake-ctx-tgt').value.trim(),
              approach: document.getElementById('intake-ctx-app').value.trim(),
            });
          }
        } catch (e) { console.error('updateContext:', e); }

        Toast.show('Proyecto guardado en servidor', 'ok');
      }
      loadServerProjects();
    } catch (err) {
      Toast.show('Error: ' + (err.message || err), 'err');
    }
  }

  /* ── Step navigation ─────────────────────────────────────────── */
  function setStep(s) {
    if (s < 0 || s >= STEPS.length) return;
    const cfg = STEPS[s];

    // Hide all static panels
    document.querySelectorAll('#panel-intake .intake-step').forEach(p => {
      p.style.display = 'none';
    });

    // Show the right panel
    const panel = document.getElementById(cfg.panel);
    if (panel) panel.style.display = 'block';

    // If it's a calculator step, render into the dynamic container
    if (cfg.calc) {
      ensureCalcInit();
      const container = document.getElementById('intake-calc-container');
      if (container) {
        switch (cfg.calc) {
          case 'rates':     Calculator.renderRatesInto(container); break;
          case 'routes':    Calculator.renderRoutesInto(container); break;
          case 'mergedWPs': Calculator.renderMergedWPs(container); break;
          case 'results':   Calculator.renderResultsInto(container); break;
          case 'gantt':     Calculator.renderGanttInto(container); break;
        }
      }
    }

    // If going to summary (step 8), build it with budget data
    if (s === STEPS.length - 1) buildSummary();

    // Update nav dots
    for (let i = 0; i < STEPS.length; i++) {
      const dot = document.getElementById('intake-sd' + i);
      const lbl = document.getElementById('intake-sl' + i);
      const con = i < STEPS.length - 1 ? document.getElementById('intake-sc' + i) : null;
      if (!dot) continue;

      dot.className = 'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-headline border-2 transition-all';
      if (i === s) {
        dot.className += ' border-primary bg-primary text-white';
        dot.textContent = i + 1;
        if (lbl) lbl.className = 'font-headline text-[10px] font-bold uppercase tracking-widest text-primary transition-colors hidden sm:inline';
      } else if (i < s) {
        dot.className += ' border-primary bg-primary/10 text-primary';
        dot.textContent = '\u2713';
        if (lbl) lbl.className = 'font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface transition-colors hidden sm:inline';
      } else {
        dot.className += ' border-outline-variant bg-surface text-on-surface-variant';
        dot.textContent = i + 1;
        if (lbl) lbl.className = 'font-headline text-[10px] font-bold uppercase tracking-widest text-on-surface-variant transition-colors hidden sm:inline';
      }
      if (con) con.className = i < s
        ? 'flex-1 h-px bg-primary mx-1 transition-colors min-w-[8px]'
        : 'flex-1 h-px bg-outline-variant mx-1 transition-colors min-w-[8px]';
    }

    step = s;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep() {
    if (!validate(step)) return;
    setStep(step + 1);
  }

  /** Called by Calculator nav buttons in embedded mode */
  function calcNav(intakeStep) {
    setStep(intakeStep);
  }

  function validate(s) {
    if (s === 0) {
      if (!selectedProgram) { Toast.show('Selecciona un programa', 'err'); return false; }
      return true;
    }
    if (s === 1) {
      if (!document.getElementById('intake-f-name').value.trim()) {
        Toast.show('El nombre del proyecto es obligatorio', 'err');
        document.getElementById('intake-f-name').focus();
        return false;
      }
      return true;
    }
    // Validate before entering calculator steps: need >=2 partners with country
    if (s === 2) {
      const validPartners = partners.filter(p => p.name && p.country);
      if (validPartners.length < 2) {
        Toast.show('Necesitas al menos 2 socios con nombre y pa\u00EDs para continuar', 'err');
        return false;
      }
      return true;
    }
    return true;
  }

  /* ── Calculator lazy init ───────────────────────────────────── */
  function ensureCalcInit() {
    if (calcInitialized && !calcNeedsReinit) return;

    // Build project data from form fields
    const projectData = {
      id: currentProjectId || 'intake-temp-' + Date.now(),
      name: document.getElementById('intake-f-name').value.trim(),
      type: document.getElementById('intake-f-type').value || null,
      start_date: document.getElementById('intake-f-start').value || null,
      duration_months: parseInt(document.getElementById('intake-f-dur').value) || 24,
      eu_grant: selectedProgram ? Number(selectedProgram.eu_grant_max) : 500000,
      cofin_pct: selectedProgram ? selectedProgram.cofin_pct : 80,
      indirect_pct: selectedProgram ? Number(selectedProgram.indirect_pct) : 7,
    };

    // Build partner list with stable IDs
    const partnerList = partners.filter(p => p.name).map((p, i) => ({
      id: p._server || ('local-' + p._local),
      name: p.name,
      city: p.city || '',
      country: p.country || '',
      order_index: i + 1,
      role: i === 0 ? 'applicant' : 'partner',
    }));

    Calculator.initFromIntake(projectData, partnerList);
    Calculator.setNavCallback(calcNav);
    calcInitialized = true;
    calcNeedsReinit = false;
  }

  /* ── Partners ────────────────────────────────────────────────── */
  function renderPartners() {
    const list = document.getElementById('intake-pt-list');
    if (!list) return;
    list.innerHTML = '';
    partners.forEach((p, i) => {
      const isApp = i === 0;
      const row = document.createElement('div');
      row.className = 'grid gap-2 items-center py-2 border-b border-outline-variant/50 relative';
      row.style.gridTemplateColumns = '28px 1fr 100px 110px 32px 80px 32px';
      row.innerHTML = `
        <span class="text-xs font-bold text-on-surface-variant text-center">${i + 1}</span>
        <input type="text" placeholder="Organisation name" value="${esc(p.name)}" data-idx="${i}" data-field="name"
          class="px-2.5 py-2 rounded-lg bg-white border border-outline-variant text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-secondary-fixed outline-none transition-all">
        <input type="text" placeholder="City" value="${esc(p.city)}" data-idx="${i}" data-field="city"
          class="px-2.5 py-2 rounded-lg bg-white border border-outline-variant text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-secondary-fixed outline-none transition-all">
        <input type="text" placeholder="Country" value="${esc(p.country)}" data-idx="${i}" data-field="country"
          class="px-2.5 py-2 rounded-lg bg-white border border-outline-variant text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-secondary-fixed outline-none transition-all">
        <button type="button" class="intake-search-entity w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-colors" data-idx="${i}" title="Buscar entidad">
          <span class="material-symbols-outlined text-base">search</span>
        </button>
        <span class="text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded text-center ${isApp
          ? 'bg-secondary-fixed/20 text-primary-container border border-secondary-fixed-dim/40'
          : 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
        }">${isApp ? 'Coord.' : 'Socio'}</span>
        <button type="button" class="intake-remove-partner w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors ${isApp ? 'opacity-20 pointer-events-none' : ''}" data-idx="${i}">
          <span class="material-symbols-outlined text-base">close</span>
        </button>
      `;
      list.appendChild(row);
    });

    // Bind input changes
    list.querySelectorAll('input[data-idx]').forEach(input => {
      input.addEventListener('input', () => {
        const idx = parseInt(input.dataset.idx);
        partners[idx][input.dataset.field] = input.value;
      });
    });

    // Bind entity search
    list.querySelectorAll('.intake-search-entity').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEntitySearch(parseInt(btn.dataset.idx));
      });
    });

    // Bind remove
    list.querySelectorAll('.intake-remove-partner').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (idx === 0) return;
        partners.splice(idx, 1);
        partners.forEach((p, j) => { p.order_index = j + 1; p.role = j === 0 ? 'applicant' : 'partner'; });
        calcNeedsReinit = true;
        renderPartners();
      });
    });
  }

  /* ── Entity search modal ─────────────────────────────────────── */
  let entityModal = null;
  let entityDebounce = null;

  function closeEntitySearch() {
    if (entityModal) { entityModal.remove(); entityModal = null; }
  }

  function openEntitySearch(partnerIdx) {
    closeEntitySearch();

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm';
    overlay.innerHTML = `
      <div class="entity-modal bg-white rounded-2xl shadow-2xl w-[640px] max-w-[90vw] max-h-[80vh] flex flex-col overflow-hidden border border-outline-variant/30">
        <div class="px-6 py-4 border-b border-outline-variant/30 flex items-center justify-between">
          <div>
            <h3 class="font-headline text-lg font-bold text-primary">Directorio de entidades</h3>
            <p class="text-xs text-on-surface-variant mt-0.5">Selecciona una entidad para a\u00F1adirla al consorcio</p>
          </div>
          <button type="button" class="entity-modal-close w-9 h-9 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="px-6 py-3 border-b border-outline-variant/20 flex flex-col gap-2">
          <input type="text" placeholder="Buscar por nombre, ciudad o PIC..." autofocus
            class="entity-search-input w-full px-4 py-2.5 rounded-lg bg-surface-container-low border border-outline-variant text-sm focus:border-primary focus:ring-2 focus:ring-secondary-fixed outline-none transition-all">
          <div class="flex gap-2">
            <select class="entity-filter-country flex-1 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-sm text-on-surface-variant cursor-pointer outline-none focus:border-primary">
              <option value="">Todos los pa\u00EDses</option>
            </select>
            <select class="entity-filter-type flex-1 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-sm text-on-surface-variant cursor-pointer outline-none focus:border-primary">
              <option value="">Todos los tipos</option>
              <option value="university">Universidad</option>
              <option value="ngo">ONG</option>
              <option value="public_body">Organismo p\u00FAblico</option>
              <option value="enterprise">Empresa</option>
              <option value="research">Centro investigaci\u00F3n</option>
              <option value="other">Otro</option>
            </select>
          </div>
        </div>
        <div class="entity-results flex-1 overflow-y-auto px-2 py-2"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    entityModal = overlay;

    const input = overlay.querySelector('.entity-search-input');
    const filterCountry = overlay.querySelector('.entity-filter-country');
    const filterType = overlay.querySelector('.entity-filter-type');
    const results = overlay.querySelector('.entity-results');

    // Close on overlay click or close button
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeEntitySearch();
    });
    overlay.querySelector('.entity-modal-close').addEventListener('click', closeEntitySearch);
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeEntitySearch();
    });

    // Load country options from ref_countries
    (async () => {
      try {
        const countries = await API.get('/admin/data/countries');
        countries.sort((a, b) => a.name_es.localeCompare(b.name_es));
        countries.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.iso2;
          opt.textContent = c.iso2 + ' \u2014 ' + c.name_es;
          filterCountry.appendChild(opt);
        });
      } catch { /* ignore — filter just won't have options */ }
    })();

    function doSearch() {
      clearTimeout(entityDebounce);
      entityDebounce = setTimeout(() => {
        searchAndRender(input.value.trim(), filterCountry.value, filterType.value);
      }, 200);
    }

    // Load all on open
    searchAndRender('', '', '');

    input.addEventListener('input', doSearch);
    filterCountry.addEventListener('change', doSearch);
    filterType.addEventListener('change', doSearch);

    async function searchAndRender(q, country, type) {
      results.innerHTML = '<p class="text-sm text-on-surface-variant py-8 text-center">Buscando...</p>';
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (country) params.set('country', country);
        if (type) params.set('type', type);
        const raw = await API.get('/intake/entities/search?' + params.toString());
        // Deduplicate by id
        const seen = new Set();
        const entities = raw.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
        if (!entities.length) {
          results.innerHTML = '<p class="text-sm text-on-surface-variant py-8 text-center">Sin resultados</p>';
          return;
        }
        results.innerHTML = '<table class="w-full text-sm"><thead class="sticky top-0 bg-white"><tr>' +
          '<th class="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Nombre</th>' +
          '<th class="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Ciudad</th>' +
          '<th class="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Pa\u00EDs</th>' +
          '<th class="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Tipo</th>' +
          '<th class="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">PIC</th>' +
          '<th class="px-2 py-2"></th>' +
          '</tr></thead><tbody>' +
          entities.map(e => `
            <tr class="entity-pick border-b border-outline-variant/20 hover:bg-primary/5 cursor-pointer transition-colors" data-id="${e.id}">
              <td class="px-4 py-2.5 font-semibold text-on-surface">${esc(e.name)}</td>
              <td class="px-3 py-2.5 text-on-surface-variant">${esc(e.city || '\u2014')}</td>
              <td class="px-3 py-2.5"><span class="font-mono text-xs font-bold text-primary">${esc(e.country_iso2)}</span> ${esc(e.country_name || '')}</td>
              <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">${esc(e.type)}</span></td>
              <td class="px-3 py-2.5 font-mono text-xs text-on-surface-variant">${esc(e.pic_number || '\u2014')}</td>
              <td class="px-2 py-2.5"><span class="material-symbols-outlined text-primary text-lg">add_circle</span></td>
            </tr>
          `).join('') +
          '</tbody></table>';

        results.querySelectorAll('.entity-pick').forEach(el => {
          el.addEventListener('click', () => {
            const ent = entities.find(e => String(e.id) === el.dataset.id);
            if (ent) {
              partners[partnerIdx].name = ent.name;
              partners[partnerIdx].city = ent.city || '';
              partners[partnerIdx].country = ent.country_name || ent.country_iso2;
              calcNeedsReinit = true;
              renderPartners();
            }
            closeEntitySearch();
          });
        });
      } catch (err) {
        results.innerHTML = '<p class="text-sm text-error py-8 text-center">Error al buscar entidades</p>';
      }
    }

    setTimeout(() => input.focus(), 50);
  }

  function addPartner() {
    pCounter++;
    partners.push({ _local: pCounter, name: '', city: '', country: '', role: 'partner', order_index: partners.length + 1 });
    calcNeedsReinit = true;
    renderPartners();
  }

  /* ── Word counters ───────────────────────────────────────────── */
  function updateWC(c) {
    const ta = document.getElementById(c.ta);
    if (!ta) return;
    const n = ta.value.trim().split(/\s+/).filter(Boolean).length;
    const b = document.getElementById(c.badge);
    const f = document.getElementById(c.bar);
    if (!b || !f) return;

    b.textContent = n + ' palabra' + (n !== 1 ? 's' : '');
    if (n === 0) {
      b.className = 'text-xs font-semibold font-headline px-2.5 py-0.5 rounded border border-outline-variant bg-surface-container-low text-on-surface-variant transition-all';
      f.style.width = '0%'; f.style.background = '#c8c5d2';
    } else if (n < c.min) {
      b.className = 'text-xs font-semibold font-headline px-2.5 py-0.5 rounded border border-yellow-400 bg-yellow-50 text-yellow-700 transition-all';
      f.style.width = (n / c.max * 100) + '%'; f.style.background = '#eab308';
    } else if (n > c.max) {
      b.className = 'text-xs font-semibold font-headline px-2.5 py-0.5 rounded border border-error/40 bg-error-container text-on-error-container transition-all';
      f.style.width = '100%'; f.style.background = '#ba1a1a';
    } else {
      b.className = 'text-xs font-semibold font-headline px-2.5 py-0.5 rounded border border-green-300 bg-green-50 text-green-700 transition-all';
      f.style.width = (n / c.max * 100) + '%'; f.style.background = '#06003e';
    }
  }

  /* ── Summary ─────────────────────────────────────────────────── */
  function buildSummary() {
    const name  = document.getElementById('intake-f-name').value.trim();
    const start = document.getElementById('intake-f-start').value;
    const dur   = document.getElementById('intake-f-dur').value;
    const desc  = document.getElementById('intake-f-desc').value.trim();
    const type  = document.getElementById('intake-f-type').value;

    document.getElementById('intake-sum-proj').innerHTML = `
      <div class="flex flex-col gap-0.5"><span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Nombre</span><span class="text-sm font-medium text-on-surface">${esc(name) || '\u2014'}</span></div>
      <div class="flex flex-col gap-0.5"><span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Tipo</span><span class="text-sm font-medium text-on-surface">${esc(type)}</span></div>
      <div class="flex flex-col gap-0.5"><span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Inicio previsto</span><span class="text-sm font-medium text-on-surface">${fmtDate(start)}</span></div>
      <div class="flex flex-col gap-0.5"><span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Duraci\u00F3n</span><span class="text-sm font-medium text-on-surface">${dur} meses</span></div>
      ${selectedProgram ? `<div class="flex flex-col gap-0.5"><span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Subvenci\u00F3n m\u00E1x.</span><span class="text-sm font-medium text-on-surface">${Number(selectedProgram.eu_grant_max).toLocaleString('es-ES')} \u20AC</span></div>` : ''}
      ${desc ? `<div class="flex flex-col gap-0.5 col-span-2"><span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Descripci\u00F3n</span><span class="text-sm font-medium text-on-surface">${esc(desc)}</span></div>` : ''}
    `;

    document.getElementById('intake-sum-partners').innerHTML = partners.map((pt, i) => `
      <div class="flex items-center gap-2 py-2.5 ${i < partners.length - 1 ? 'border-b border-outline-variant/50' : ''}">
        <span class="text-xs font-bold text-on-surface-variant w-4">${i + 1}</span>
        <span class="font-headline text-sm font-bold text-primary">${esc(pt.name) || '\u2014'}</span>
        <span class="text-outline-variant">\u00B7</span>
        <span class="text-sm text-on-surface-variant flex-1">${[pt.city, pt.country].filter(Boolean).join(', ') || '\u2014'}</span>
        <span class="text-[11px] font-bold uppercase tracking-wide ${i === 0 ? 'text-primary' : 'text-on-surface-variant'}">${i === 0 ? 'Coordinador' : 'Socio'}</span>
      </div>
    `).join('');

    document.getElementById('intake-sum-ctx').innerHTML = [
      { lbl: 'Problema / necesidad', id: 'intake-ctx-prob' },
      { lbl: 'Grupos destinatarios', id: 'intake-ctx-tgt' },
      { lbl: 'Enfoque y propuesta',  id: 'intake-ctx-app' },
    ].map(r => {
      const v = document.getElementById(r.id).value.trim();
      return `<div class="mb-4">
        <span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">${r.lbl}</span>
        ${v ? `<div class="text-sm text-on-surface-variant leading-relaxed mt-1">${esc(v.substring(0, 300) + (v.length > 300 ? '\u2026' : ''))}</div>`
            : `<div class="text-sm text-on-surface-variant italic mt-1">Sin rellenar</div>`}
      </div>`;
    }).join('');

    // Budget summary (from Calculator state)
    const budgetEl = document.getElementById('intake-sum-budget');
    if (calcInitialized && typeof Calculator !== 'undefined' && Calculator.isInitialized()) {
      const cs = Calculator.getCalcState();
      const fmt = n => '\u20AC' + Math.round(n).toLocaleString('es-ES');

      let budgetHTML = `
        <div class="bg-primary text-white rounded-xl p-4 mb-4">
          <div class="text-[10px] uppercase tracking-wider opacity-50 mb-1">Total presupuesto</div>
          <div class="font-headline text-2xl font-bold">${fmt(cs.total)}</div>
          <div class="flex gap-4 mt-2 text-xs opacity-70 flex-wrap">
            <span>Directo: <strong>${fmt(cs.directCosts)}</strong></span>
            <span>Indirecto ${cs.indirectPct}%: <strong>${fmt(cs.indirect)}</strong></span>
            <span>Target: <strong>${fmt(cs.financials.totalProject)}</strong></span>
          </div>
        </div>
        <div class="space-y-1">
          ${cs.wps.map((wp, i) => `
            <div class="flex justify-between py-1.5 text-sm border-b border-outline-variant/10">
              <span class="font-medium text-on-surface">WP${i+1} \u00B7 ${esc(wp.desc || wp.name || 'Sin t\u00EDtulo')}</span>
            </div>
          `).join('')}
        </div>`;

      if (budgetEl) {
        budgetEl.innerHTML = budgetHTML;
      }
    } else if (budgetEl) {
      budgetEl.innerHTML = '<p class="text-sm text-on-surface-variant italic">No se ha configurado el presupuesto a\u00FAn</p>';
    }
  }

  /* ── File save/load ──────────────────────────────────────────── */
  function buildJSON() {
    return {
      meta: { version: '1.0', tool: 'erasmus-intake', generated_at: new Date().toISOString(), source_module: 'intake' },
      program: selectedProgram ? selectedProgram.program_id : null,
      fields: {
        proj_name:    document.getElementById('intake-f-name').value.trim(),
        proj_type:    document.getElementById('intake-f-type').value,
        proj_desc:    document.getElementById('intake-f-desc').value.trim(),
        proj_start:   document.getElementById('intake-f-start').value,
        months:       String(document.getElementById('intake-f-dur').value),
        eu_grant:     selectedProgram ? String(selectedProgram.eu_grant_max) : '0',
        cofin_pct:    selectedProgram ? String(selectedProgram.cofin_pct) : '0',
        indirect_pct: selectedProgram ? String(selectedProgram.indirect_pct) : '0',
      },
      partners: partners.map(pt => ({ name: pt.name, city: pt.city, country: pt.country, role: pt.role, order_index: pt.order_index })),
      intake: {
        idea: {
          problem:       document.getElementById('intake-ctx-prob').value.trim(),
          target_groups: document.getElementById('intake-ctx-tgt').value.trim(),
          approach:      document.getElementById('intake-ctx-app').value.trim()
        }
      }
    };
  }

  function saveToFile() {
    const json = buildJSON();
    const slug = (json.fields.proj_name || 'intake').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = slug + '-intake.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
    Toast.show('Intake guardado como JSON', 'ok');
  }

  function loadFromFile(ev) {
    const file = ev.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = e => {
      try {
        const d = JSON.parse(e.target.result);
        restoreFromJSON(d);
        Toast.show('Archivo cargado', 'ok');
      } catch { Toast.show('Error al leer el JSON', 'err'); }
    };
    r.readAsText(file);
    ev.target.value = '';
  }

  function restoreFromJSON(d) {
    const f = d.fields || {};
    if (f.proj_name) document.getElementById('intake-f-name').value = f.proj_name;
    if (f.proj_desc) document.getElementById('intake-f-desc').value = f.proj_desc;
    if (f.proj_start) document.getElementById('intake-f-start').value = f.proj_start;
    if (f.proj_type) document.getElementById('intake-f-type').value = f.proj_type;
    if (f.months) {
      const sel = document.getElementById('intake-f-dur');
      for (const o of sel.options) { if (o.value == f.months) { o.selected = true; break; } }
    }

    // Match program
    if (d.program && programs.length) {
      const idx = programs.findIndex(p => p.program_id === d.program);
      if (idx >= 0) selectProgram(idx);
    }

    const pl = d.partners || (d.state && d.state.partners);
    if (pl && pl.length) {
      partners = pl.map((p, i) => ({
        _local: i + 1, name: p.name || '', city: p.city || '', country: p.country || '',
        role: i === 0 ? 'applicant' : 'partner', order_index: i + 1
      }));
      pCounter = partners.length;
      renderPartners();
    }

    const idea = (d.intake && d.intake.idea) || {};
    if (idea.problem) { document.getElementById('intake-ctx-prob').value = idea.problem; updateWC(WC[0]); }
    if (idea.target_groups) { document.getElementById('intake-ctx-tgt').value = idea.target_groups; updateWC(WC[1]); }
    if (idea.approach) { document.getElementById('intake-ctx-app').value = idea.approach; updateWC(WC[2]); }

    currentProjectId = null;
    setStep(0);
  }

  function exportWizard() {
    const json = buildJSON();
    // Add wizard-specific fields
    json.state = {
      maxReached: 1,
      partners: partners.map(pt => ({ ...pt })),
      routes: {}, wps: [], workerRates: [], wrCounter: 0,
      perdiemRates: {}, extraDestinations: []
    };
    const slug = (json.fields.proj_name || 'proyecto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = slug + '-wizard-ready.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 300);
    Toast.show('JSON exportado para Calculator', 'ok');
  }

  /* ── Reset form ──────────────────────────────────────────────── */
  function resetForm() {
    currentProjectId = null;
    calcInitialized = false;
    calcNeedsReinit = false;
    document.getElementById('intake-f-name').value = '';
    document.getElementById('intake-f-desc').value = '';
    document.getElementById('intake-f-start').value = '';
    document.getElementById('intake-ctx-prob').value = '';
    document.getElementById('intake-ctx-tgt').value = '';
    document.getElementById('intake-ctx-app').value = '';
    partners = [{ _local: 1, name: '', city: '', country: '', role: 'applicant', order_index: 1 }];
    pCounter = 1;
    renderPartners();
    WC.forEach(c => updateWC(c));
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toDateStr(v) {
    if (!v) return '';
    // Handle ISO datetime strings like "2026-08-31T22:00:00.000Z"
    if (typeof v === 'string') return v.slice(0, 10);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return '';
  }

  function fmtDate(iso) {
    const s = toDateStr(iso);
    if (!s) return '\u2014';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }

  /* ── Demo preload ────────────────────────────────────────────── */
  function preloadDemo() {
    init();
    resetForm();

    // Select first program if available
    if (programs.length > 0) selectProgram(0);

    // Project data
    document.getElementById('intake-f-name').value = 'ARISE';
    const fullName = document.getElementById('intake-f-fullname');
    if (fullName) fullName.value = 'Action for Resilience and Innovation in Sustainable Education';
    document.getElementById('intake-f-desc').value = 'A KA2 Cooperation Partnership fostering innovative pedagogical approaches to sustainability education across European secondary schools, combining digital tools, teacher training, and community engagement to build climate-resilient curricula.';
    document.getElementById('intake-f-start').value = '2026-09-01';
    const durSel = document.getElementById('intake-f-dur');
    if (durSel) { for (const o of durSel.options) { if (o.value === '24') { o.selected = true; break; } } }

    // 3 Partners
    partners = [
      { _local: 1, _server: null, name: 'Fundaci\u00F3n EduForward',      city: 'Madrid',    country: 'Spain',   role: 'applicant', order_index: 1 },
      { _local: 2, _server: null, name: 'Universit\u00E4t Hannover',       city: 'Hannover',  country: 'Germany', role: 'partner',   order_index: 2 },
      { _local: 3, _server: null, name: 'Acad\u00E9mie de Bordeaux',       city: 'Bordeaux',  country: 'France',  role: 'partner',   order_index: 3 },
    ];
    pCounter = 3;
    renderPartners();

    // Context
    document.getElementById('intake-ctx-prob').value = 'Climate change and sustainability represent the defining challenge of our era, yet European secondary education systems remain largely unprepared to equip young people with the knowledge, skills and attitudes needed to respond. A 2024 Eurydice report found that only 23% of EU member states have integrated sustainability as a transversal competence across their national curricula. Teachers report feeling under-resourced: 68% cite a lack of training in sustainability pedagogy and 54% say they have no access to quality, localised teaching materials. Meanwhile, student surveys show growing eco-anxiety paired with a sense of helplessness, suggesting that current approaches fail to empower learners as agents of change. The gap between policy ambition (the EU GreenComp framework, the Council Recommendation on learning for the green transition) and classroom reality is widening rather than closing. Rural and disadvantaged schools are disproportionately affected, deepening educational inequality. Without targeted, transnational cooperation that develops scalable pedagogical models and supports teacher capacity, a generation of European students risks graduating without the foundational sustainability literacy the green transition demands.';

    document.getElementById('intake-ctx-tgt').value = 'The primary beneficiaries are secondary-school teachers (estimated 120 directly trained, 600+ reached through multiplier events and open resources) and their students aged 14\u201318 across Spain, Germany and France. Special attention will be given to educators in rural and under-served schools, where access to professional development is most limited. Indirect beneficiaries include school leadership teams who will receive policy toolkits, local communities engaged through student-led sustainability projects, and curriculum designers in national agencies who will access the project\u2019s validated methodology. The broader education research community will also benefit through openly published findings and a replicable framework adaptable to other EU countries.';

    document.getElementById('intake-ctx-app').value = 'ARISE proposes a three-phase methodology combining co-design, piloting and scaling. In Phase 1 (M1\u201310), partners conduct a comparative needs analysis across the three countries, mapping existing sustainability content in curricula, teacher competence gaps and student perceptions. Building on GreenComp and the SDGs, an interdisciplinary team will co-create a modular Sustainability Teaching Toolkit comprising lesson plans, digital simulations and place-based learning activities adaptable to local contexts. In Phase 2 (M8\u201318), the toolkit is piloted in 12 schools (4 per country), accompanied by a blended teacher training programme (60 hours: 20 online + 40 face-to-face through LTTAs). Each school implements a student-led Community Sustainability Project, bridging classroom learning and real-world impact. Longitudinal data on student competence development and teacher self-efficacy is collected using validated instruments. In Phase 3 (M16\u201324), results are analysed, the toolkit is refined based on evidence, and a Sustainability Education Policy Brief is published to inform national stakeholders. Multiplier events in each country disseminate outcomes to at least 200 education professionals. All outputs are released under Creative Commons and hosted on a multilingual platform. The transnational dimension is essential: cross-country comparison enriches the methodology, joint LTTAs build a community of practice, and shared intellectual outputs achieve economies of scale impossible at national level.';

    WC.forEach(c => updateWC(c));

    // Init calculator with demo data
    calcInitialized = false;
    calcNeedsReinit = false;
    ensureCalcInit();

    // Now populate Calculator state with activities
    const cs = Calculator.getCalcState();
    const pts = cs.partners;
    const st = Calculator;

    // Set some route distances
    if (pts.length >= 3) {
      // Madrid-Hannover ~1800km, Madrid-Bordeaux ~600km, Hannover-Bordeaux ~1000km
      st._setRouteBand(pts[0].id, pts[1].id, 3); // 500-1999
      st._setRouteBand(pts[0].id, pts[2].id, 3); // 500-1999
      st._setRouteBand(pts[1].id, pts[2].id, 3); // 500-1999
    }

    // WPs already have 4 defaults. Let's add activities to each.
    // WP1 (Management): already has mgmt activity by default after renderMergedWPs
    // We need to trigger renderMergedWPs first to seed WP1's mgmt activity
    const tmpDiv = document.createElement('div');
    st.renderMergedWPs(tmpDiv);

    // WP2: Add a Transnational Meeting + an IO
    st._addActivity(1, 'meeting');  // Transnational Meeting in WP2
    st._addActivity(1, 'io');       // Intellectual Output in WP2

    // WP3: Add LTTA + local workshops
    st._addActivity(2, 'ltta');     // LTTA mobility
    st._addActivity(2, 'local_ws'); // Local workshops

    // WP4: Add Multiplier Event + Dissemination campaign
    st._addActivity(3, 'me');       // Multiplier event
    st._addActivity(3, 'campaign'); // Dissemination

    // Set some labels
    const wps = Calculator.getCalcState().wps;
    st._setWP(0, 'desc', 'Project Management and Coordination');
    st._setWP(1, 'name', 'WP2'); st._setWP(1, 'desc', 'Research, Analysis and Toolkit Development');
    st._setWP(2, 'name', 'WP3'); st._setWP(2, 'desc', 'Piloting, Training and Community Projects');
    st._setWP(3, 'name', 'WP4'); st._setWP(3, 'desc', 'Dissemination, Exploitation and Sustainability');

    // Label activities
    if (wps[1] && wps[1].activities.length >= 2) {
      st._setAct(1, wps[1].activities[0].id, 'label', 'Kick-off Meeting (Madrid)');
      st._setAct(1, wps[1].activities[0].id, 'days', 3);
      st._setAct(1, wps[1].activities[1].id, 'label', 'Sustainability Teaching Toolkit');
    }
    if (wps[2] && wps[2].activities.length >= 2) {
      st._setAct(2, wps[2].activities[0].id, 'label', 'Teacher Training LTTA (Hannover)');
      st._setAct(2, wps[2].activities[0].id, 'days', 5);
      st._setAct(2, wps[2].activities[0].id, 'pax', 3);
      st._setAct(2, wps[2].activities[1].id, 'label', 'Local Pilot Workshops (12 schools)');
    }
    if (wps[3] && wps[3].activities.length >= 2) {
      st._setAct(3, wps[3].activities[0].id, 'label', 'Multiplier Events (3 countries)');
      st._setAct(3, wps[3].activities[1].id, 'label', 'Online Dissemination Campaign');
    }

    // Navigate to step 5 (WPs) to show the filled wizard
    setStep(5);
    Toast.show('Demo cargada: ARISE \u2014 3 socios, 4 WPs', 'ok');
  }

  return { init, startNew, _calcNav: calcNav, _preloadDemo: preloadDemo, _loadProject: loadFromServer };
})();
