/* ═══════════════════════════════════════════════════════════════
   Intake — Wizard module for creating Erasmus+ project proposals
   Uses API module for authenticated requests to /v1/intake/*
   ═══════════════════════════════════════════════════════════════ */

const Intake = (() => {
  let initialized = false;
  let step = 0;
  let selectedProgram = null;
  let _dirty = false;
  let programs = [];
  let partners = [{ _local: 1, name: '', city: '', country: '', role: 'applicant', order_index: 1 }];
  let pCounter = 1;
  let currentProjectId = null;
  let calcInitialized = false;
  let calcNeedsReinit = false;

  /* ── Step configuration (9 steps) ───────────────────────────── */
  const STEPS = [
    { key: 'proyecto',     label: 'Proyecto',      icon: 'description',   panel: 'intake-p1' },
    { key: 'contexto',     label: 'Contexto',      icon: 'edit_note',     panel: 'intake-p2' },
    { key: 'tarifas',      label: 'Tarifas',       icon: 'euro',          panel: 'intake-dynamic', calc: 'rates' },
    { key: 'rutas',        label: 'Rutas',         icon: 'route',         panel: 'intake-dynamic', calc: 'routes' },
    { key: 'wps',          label: 'WPs',           icon: 'account_tree',  panel: 'intake-dynamic', calc: 'mergedWPs' },
    { key: 'presupuesto',  label: 'Budget',        icon: 'payments',      panel: 'intake-dynamic', calc: 'results' },
    { key: 'tareas',       label: 'Tareas',        icon: 'task_alt',      panel: 'intake-tasks' },
    { key: 'gantt',        label: 'Gantt',         icon: 'timeline',      panel: 'intake-gantt' },
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
      setStep(s);
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

    // Word counters — marcar dirty al editar
    WC.forEach(c => {
      document.getElementById(c.ta)?.addEventListener('input', () => { updateWC(c); _dirty = true; });
    });

    // Sync visible duration/start fields → hidden fields
    document.getElementById('intake-f-dur-visible')?.addEventListener('change', (e) => {
      const v = parseInt(e.target.value) || 24;
      document.getElementById('intake-f-dur').value = v;
      _dirty = true;
    });
    document.getElementById('intake-f-start-visible')?.addEventListener('change', (e) => {
      document.getElementById('intake-f-start').value = e.target.value;
      _dirty = true;
    });

    // Marcar dirty en cualquier otro campo del formulario
    document.querySelectorAll('#panel-intake input, #panel-intake select, #panel-intake textarea')
      .forEach(el => el.addEventListener('input', () => { _dirty = true; }));

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
    } catch (err) {
      console.error('loadPrograms:', err);
    }
  }

  function selectProgram(id) {
    selectedProgram = programs.find(p => p.id === id);
    if (!selectedProgram) return;
    const p = selectedProgram;

    const setVal = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v || ''; };
    setVal('intake-f-start', p.start_date_min ? toDateStr(p.start_date_min) : '');
    setVal('intake-f-dur', p.duration_max_months || 24);
    setVal('intake-f-type', p.action_type || '');

    // Sync visible fields
    setVal('intake-f-dur-visible', p.duration_max_months || 24);
    setVal('intake-f-start-visible', p.start_date_min ? toDateStr(p.start_date_min) : '');
    setVal('intake-f-type-visible', p.action_type || '');
  }

  /* ── Server projects ─────────────────────────────────────────── */
  async function loadServerProjects() {
    const el = document.getElementById('intake-server-projects');
    if (!el) return;
    try {
      const result = await API.get('/intake/projects');
      const projects = Array.isArray(result) ? result : (result.data || result);
      if (!projects || projects.length === 0) {
        el.innerHTML = '<div class="py-6 text-center"><span class="material-symbols-outlined text-3xl text-outline-variant block mb-2">folder_open</span><p class="text-xs text-on-surface-variant mb-2">Aún no tienes proyectos guardados</p><button onclick="document.getElementById('intake-btn-save-server')?.click()" class="text-xs font-semibold text-primary hover:underline">Guardar el actual</button></div>';
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
      const fullnameEl = document.getElementById('intake-f-fullname');
      if (fullnameEl && !fullnameEl.value) fullnameEl.value = project.fullname || '';
      document.getElementById('intake-f-desc').value = project.description || '';
      document.getElementById('intake-f-start').value = toDateStr(project.start_date);
      document.getElementById('intake-f-type').value = project.type || '';

      if (project.duration_months) {
        const durEl = document.getElementById('intake-f-dur');
        if (durEl) durEl.value = project.duration_months;
        const durVis = document.getElementById('intake-f-dur-visible');
        if (durVis) durVis.value = project.duration_months;
      }

      // Sync visible start/type fields
      const startVis = document.getElementById('intake-f-start-visible');
      if (startVis) startVis.value = toDateStr(project.start_date);
      const typeVis = document.getElementById('intake-f-type-visible');
      if (typeVis) typeVis.value = project.type || '';

      // Select matching program
      if (project.type && programs.length) {
        const match = programs.find(p => p.action_type === project.type);
        if (match) selectProgram(match.id);
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
      setStep(targetStep != null ? targetStep : 0);
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
      const projectData = {
        name,
        type: document.getElementById('intake-f-type').value || null,
        description: document.getElementById('intake-f-desc').value.trim() || null,
        start_date: document.getElementById('intake-f-start').value || null,
        duration_months: parseInt(document.getElementById('intake-f-dur').value) || null,
        eu_grant: selectedProgram ? Number(selectedProgram.eu_grant_max) : 0,
        cofin_pct: selectedProgram ? selectedProgram.cofin_pct : 0,
        indirect_pct: selectedProgram ? Number(selectedProgram.indirect_pct) : 0,
      };
      const contextData = {
        problem: document.getElementById('intake-ctx-prob').value.trim(),
        target_groups: document.getElementById('intake-ctx-tgt').value.trim(),
        approach: document.getElementById('intake-ctx-app').value.trim(),
      };

      if (currentProjectId) {
        // Guardar proyecto y contexto en paralelo
        const saves = [API.patch('/intake/projects/' + currentProjectId, projectData)];
        const contexts = await API.get('/intake/projects/' + currentProjectId + '/context');
        if (contexts && contexts.length > 0) {
          saves.push(API.patch('/intake/contexts/' + contexts[0].id, contextData));
        }
        await Promise.all(saves);
        _dirty = false;
        Toast.show('Proyecto actualizado', 'ok');
      } else {
        // Crear nuevo proyecto
        const project = await API.post('/intake/projects', projectData);
        currentProjectId = project.id;

        // Socios y contexto en paralelo
        const ops = [];
        for (const pt of partners) {
          if (pt.name && pt.name.trim()) {
            ops.push(API.post('/intake/projects/' + currentProjectId + '/partners', {
              name: pt.name.trim(), city: pt.city || null, country: pt.country || null
            }));
          }
        }
        const contexts = await API.get('/intake/projects/' + currentProjectId + '/context');
        if (contexts && contexts.length > 0) {
          ops.push(API.patch('/intake/contexts/' + contexts[0].id, contextData));
        }
        if (ops.length) await Promise.all(ops);
        _dirty = false;
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

    // If going to gantt step, render gantt UI
    if (cfg.key === 'gantt' && typeof IntakeGantt !== 'undefined') {
      IntakeGantt.render(document.getElementById('intake-gantt-container'), currentProjectId);
    }

    // If going to tasks step, render tasks UI
    if (cfg.key === 'tareas' && typeof IntakeTasks !== 'undefined') {
      IntakeTasks.render(document.getElementById('intake-tasks-container'), currentProjectId);
    }

    // If going to summary, build it with budget data
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
      const labels = { 'intake-ctx-prob': 'Problema / Necesidad', 'intake-ctx-tgt': 'Grupos destinatarios', 'intake-ctx-app': 'Enfoque y propuesta' };
      for (const c of WC) {
        const ta = document.getElementById(c.ta);
        if (!ta) continue;
        const n = ta.value.trim().split(/\s+/).filter(Boolean).length;
        if (n < c.min) {
          Toast.show(`"${labels[c.ta]}": mínimo ${c.min} palabras (tienes ${n})`, 'err');
          ta.focus();
          return false;
        }
        if (n > c.max) {
          Toast.show(`"${labels[c.ta]}": máximo ${c.max} palabras (tienes ${n})`, 'err');
          ta.focus();
          return false;
        }
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

    // Auto-load ARISE demo activities if project is ARISE and no activities yet
    const calcState = Calculator.getCalcState();
    const acronym = document.getElementById('intake-f-name')?.value?.trim();
    const hasActivities = calcState.wps.some(wp => wp.activities.length > 1);
    if (acronym === 'ARISE' && !hasActivities && calcState.partners.length >= 4) {
      loadAriseActivities(calcState.partners);
    }
  }

  function loadAriseActivities(pts) {
    const st = Calculator;
    // Helper: month number (1-based) to ISO date from project start
    const psStr = document.getElementById('intake-f-start')?.value || '2027-03-01';
    const psY = parseInt(psStr.split('-')[0]);
    const psM = parseInt(psStr.split('-')[1]) - 1; // 0-based month

    function monthStartISO(m) {
      // Month 1 = project start month, Month 2 = next month, etc.
      const y = psY + Math.floor((psM + m - 1) / 12);
      const mo = (psM + m - 1) % 12;
      return `${y}-${String(mo+1).padStart(2,'0')}-01`;
    }
    function monthEndISO(m) {
      const y = psY + Math.floor((psM + m) / 12);
      const mo = (psM + m) % 12;
      const lastDay = new Date(y, mo, 0).getDate();
      const my = psY + Math.floor((psM + m - 1) / 12);
      const mm = (psM + m - 1) % 12;
      return `${my}-${String(mm+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
    }
    function setDates(wi, actId, startM, endM) {
      const act = Calculator.getCalcState().wps[wi]?.activities?.find(a => a.id === actId);
      if (act) {
        act.date_start = monthStartISO(startM);
        act.date_end = monthEndISO(endM);
        act._gantt_start = startM;
        act._gantt_end = endM;
      }
    }

    // WP1: Management rates
    const wps = Calculator.getCalcState().wps;
    if (wps[0]?.activities[0]) {
      st._setAct(0, wps[0].activities[0].id, 'rate_applicant', 600);
      st._setAct(0, wps[0].activities[0].id, 'rate_partner', 300);
    }

    // WP1: 4 Transnational meetings + Local workshop
    st._addActivity(0, 'meeting'); st._addActivity(0, 'meeting'); st._addActivity(0, 'meeting');
    st._addActivity(0, 'local_ws');

    let cs = Calculator.getCalcState().wps;
    if (cs[0]?.activities[1]) { st._setActSubtype(0, cs[0].activities[1].id, 'Kick-off meeting'); st._setAct(0, cs[0].activities[1].id, 'pax', 2); st._setAct(0, cs[0].activities[1].id, 'days', 4); }
    if (cs[0]?.activities[2]) { st._setActSubtype(0, cs[0].activities[2].id, 'Mid-term meeting'); st._setAct(0, cs[0].activities[2].id, 'pax', 2); st._setAct(0, cs[0].activities[2].id, 'days', 4); if(pts[1]) st._setActHost(0, cs[0].activities[2].id, pts[1].id); }
    if (cs[0]?.activities[3]) { st._setActSubtype(0, cs[0].activities[3].id, 'Mid-term meeting'); st._setAct(0, cs[0].activities[3].id, 'pax', 2); st._setAct(0, cs[0].activities[3].id, 'days', 4); if(pts[2]) st._setActHost(0, cs[0].activities[3].id, pts[2].id); }
    if (cs[0]?.activities[4]) { st._setActSubtype(0, cs[0].activities[4].id, 'Final meeting'); st._setAct(0, cs[0].activities[4].id, 'pax', 2); st._setAct(0, cs[0].activities[4].id, 'days', 5); if(pts[3]) st._setActHost(0, cs[0].activities[4].id, pts[3].id); }

    // WP2: 2 LTTA + 2 IO
    st._addActivity(1, 'ltta'); st._addActivity(1, 'ltta');
    st._addActivity(1, 'io'); st._addActivity(1, 'io');

    cs = Calculator.getCalcState().wps;
    if (cs[1]?.activities[0]) { st._setActSubtype(1, cs[1].activities[0].id, 'Training mobility'); st._setAct(1, cs[1].activities[0].id, 'pax', 4); st._setAct(1, cs[1].activities[0].id, 'days', 6); if(pts[1]) st._setActHost(1, cs[1].activities[0].id, pts[1].id); }
    if (cs[1]?.activities[1]) { st._setActSubtype(1, cs[1].activities[1].id, 'Study visit mobility'); st._setAct(1, cs[1].activities[1].id, 'pax', 4); st._setAct(1, cs[1].activities[1].id, 'days', 6); if(pts[2]) st._setActHost(1, cs[1].activities[1].id, pts[2].id); }
    if (cs[1]?.activities[2]) { st._setActSubtype(1, cs[1].activities[2].id, 'Toolkit'); }
    if (cs[1]?.activities[3]) { st._setActSubtype(1, cs[1].activities[3].id, 'Methodological guide'); }

    // IO staff: set days to match budget
    cs = Calculator.getCalcState().wps;
    if (cs[1]?.activities[2]?.io_staff) {
      Object.keys(cs[1].activities[2].io_staff).forEach(pid => {
        const staff = cs[1].activities[2].io_staff[pid].staff;
        if (staff[0]) { staff[0].days = 20; }
      });
    }
    if (cs[1]?.activities[3]?.io_staff) {
      Object.keys(cs[1].activities[3].io_staff).forEach(pid => {
        const staff = cs[1].activities[3].io_staff[pid].staff;
        if (staff[0]) { staff[0].days = 60; }
      });
    }

    // WP3: Training big + Training + Volunteering + ME + Community WS
    st._addActivity(2, 'ltta'); st._addActivity(2, 'ltta'); st._addActivity(2, 'ltta');
    st._addActivity(2, 'me'); st._addActivity(2, 'local_ws');

    cs = Calculator.getCalcState().wps;
    if (cs[2]?.activities[0]) { st._setActSubtype(2, cs[2].activities[0].id, 'Training mobility'); st._setAct(2, cs[2].activities[0].id, 'pax', 10); st._setAct(2, cs[2].activities[0].id, 'days', 8); }
    if (cs[2]?.activities[1]) { st._setActSubtype(2, cs[2].activities[1].id, 'Training mobility'); st._setAct(2, cs[2].activities[1].id, 'pax', 4); st._setAct(2, cs[2].activities[1].id, 'days', 6); if(pts[3]) st._setActHost(2, cs[2].activities[1].id, pts[3].id); }
    if (cs[2]?.activities[2]) { st._setActSubtype(2, cs[2].activities[2].id, 'Volunteering mobility'); st._setAct(2, cs[2].activities[2].id, 'pax', 8); st._setAct(2, cs[2].activities[2].id, 'days', 50); }
    if (cs[2]?.activities[4]) { st._setActSubtype(2, cs[2].activities[4].id, 'Community workshop'); }

    // WP4: Dissemination + Website + Group mobility
    st._addActivity(3, 'campaign'); st._addActivity(3, 'website'); st._addActivity(3, 'ltta');

    cs = Calculator.getCalcState().wps;
    if (cs[3]?.activities[1]) { st._setActSubtype(3, cs[3].activities[1].id, 'Project website'); }
    if (cs[3]?.activities[2]) { st._setActSubtype(3, cs[3].activities[2].id, 'Group mobility'); st._setAct(3, cs[3].activities[2].id, 'pax', 4); st._setAct(3, cs[3].activities[2].id, 'days', 3); }

    // Set Gantt dates (month numbers)
    cs = Calculator.getCalcState().wps;
    // WP1: mgmt(1-24), kick-off(1-1), mid-term1(9-9), mid-term2(16-16), final(24-24), local_ws(auto)
    if (cs[0]?.activities[0]) setDates(0, cs[0].activities[0].id, 1, 24);
    if (cs[0]?.activities[1]) setDates(0, cs[0].activities[1].id, 1, 1);
    if (cs[0]?.activities[2]) setDates(0, cs[0].activities[2].id, 9, 9);
    if (cs[0]?.activities[3]) setDates(0, cs[0].activities[3].id, 16, 16);
    if (cs[0]?.activities[4]) setDates(0, cs[0].activities[4].id, 24, 24);
    if (cs[0]?.activities[5]) setDates(0, cs[0].activities[5].id, 2, 22);

    // WP2: training(4-5), study(13-14), toolkit IO(6-16), method guide IO(10-20)
    if (cs[1]?.activities[0]) setDates(1, cs[1].activities[0].id, 4, 5);
    if (cs[1]?.activities[1]) setDates(1, cs[1].activities[1].id, 13, 14);
    if (cs[1]?.activities[2]) setDates(1, cs[1].activities[2].id, 6, 16);
    if (cs[1]?.activities[3]) setDates(1, cs[1].activities[3].id, 10, 20);

    // WP3: training big(11-11), training2(20-20), volunteering(4-20), ME(21-24), community ws(18-23)
    if (cs[2]?.activities[0]) setDates(2, cs[2].activities[0].id, 11, 11);
    if (cs[2]?.activities[1]) setDates(2, cs[2].activities[1].id, 20, 20);
    if (cs[2]?.activities[2]) setDates(2, cs[2].activities[2].id, 4, 20);
    if (cs[2]?.activities[3]) setDates(2, cs[2].activities[3].id, 21, 24);
    if (cs[2]?.activities[4]) setDates(2, cs[2].activities[4].id, 18, 23);

    // WP4: dissemination(1-24), website(1-24), group mobility(23-23)
    if (cs[3]?.activities[0]) setDates(3, cs[3].activities[0].id, 1, 24);
    if (cs[3]?.activities[1]) setDates(3, cs[3].activities[1].id, 1, 24);
    if (cs[3]?.activities[2]) setDates(3, cs[3].activities[2].id, 23, 23);
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
      const match = programs.find(p => p.program_id === d.program);
      if (match) selectProgram(match.id);
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
    if (programs.length > 0) selectProgram(programs[0].id);

    // Project data — ARISE KA3-Youth (load from server if exists)
    document.getElementById('intake-f-name').value = 'ARISE';
    const fullName = document.getElementById('intake-f-fullname');
    if (fullName) fullName.value = 'Action for Resilience and Innovation in Social Europe';
    document.getElementById('intake-f-desc').value = 'ARISE is a KA3 European Youth Together project that empowers young people aged 18\u201330 to become agents of social inclusion through sport and non-formal education. Through a network of 4 organisations in 4 countries, the project designs and tests innovative youth-led programmes combining physical activity, intercultural dialogue and digital storytelling to reach marginalised communities \u2014 particularly young migrants, NEETs and youth with fewer opportunities in rural and peri-urban areas. Over 24 months, ARISE will train 80 youth leaders, run 16 local pilot actions, organise 3 transnational youth exchanges and produce an open-access Youth Inclusion Toolkit validated by peer evaluation across all partner countries.';
    document.getElementById('intake-f-start').value = '2027-03-01';
    const durHidden = document.getElementById('intake-f-dur');
    if (durHidden) durHidden.value = '24';

    // 4 Partners — 4 countries
    partners = [
      { _local: 1, _server: null, name: 'Asociaci\u00F3n Building Bridges',    city: 'Salamanca',    country: 'Spain',   role: 'applicant', order_index: 1 },
      { _local: 2, _server: null, name: 'CESIE',                               city: 'Palermo',      country: 'Italy',   role: 'partner',   order_index: 2 },
      { _local: 3, _server: null, name: 'Youth Express Network',               city: 'Strasbourg',   country: 'France',  role: 'partner',   order_index: 3 },
      { _local: 4, _server: null, name: 'Aristotle University of Thessaloniki', city: 'Thessaloniki', country: 'Greece',  role: 'partner',   order_index: 4 },
    ];
    pCounter = 4;
    renderPartners();

    // Context
    document.getElementById('intake-ctx-prob').value = 'Across Europe, young people from marginalised backgrounds \u2014 migrants, refugees, NEETs, rural youth and those with fewer opportunities \u2014 face persistent barriers to social participation and civic engagement. Eurostat (2025) reports that 11.2% of EU youth aged 15\u201329 are neither in employment, education nor training, with peaks above 18% in Southern and South-Eastern Europe. Meanwhile, sport and physical activity, widely recognised as powerful vehicles for inclusion (Council Recommendation 2024 on sport and social inclusion), remain under-exploited in youth work: only 14% of Erasmus+ youth projects combine sport with non-formal education methodologies. Existing initiatives tend to be local, short-lived and poorly documented, making replication difficult. Youth workers report a lack of structured, evidence-based toolkits that bridge sport, intercultural dialogue and digital competences. Without transnational cooperation to co-design, test and validate scalable models, the potential of sport as an inclusion lever for Europe\u2019s most vulnerable youth will continue to be under-realised, deepening inequalities at a time when cohesion is more critical than ever.';

    document.getElementById('intake-ctx-tgt').value = 'Primary: 80 youth leaders aged 18\u201330 trained directly through the programme (20 per country), including young people with migrant backgrounds, NEETs and youth from rural areas. They will gain competences in facilitation, intercultural mediation and digital storytelling. Secondary: 480+ young participants reached through 16 local pilot actions (4 per country), with priority given to those facing social, economic or geographic barriers. Indirect: 200+ youth workers and educators reached through 3 multiplier events and the open-access toolkit. Institutional: local authorities, sport federations and youth councils in each partner city, who will receive policy recommendations. The broader youth work community benefits from openly published research findings, the validated toolkit (CC BY-SA) and a replicable model transferable to other EU countries and youth-serving organisations.';

    document.getElementById('intake-ctx-app').value = 'ARISE follows a participatory action-research cycle across three phases. Phase 1 \u2014 Co-Design (M1\u20138): Partners conduct a transnational needs assessment using surveys, focus groups and desk research in all 4 countries, mapping existing sport-for-inclusion practices, youth worker competence gaps and target group needs. Results feed into a co-creation workshop (LTTA, Salamanca) where youth leaders and experts jointly design the ARISE Youth Inclusion Toolkit: 12 modular session plans combining sport, intercultural dialogue and digital storytelling, adaptable to local contexts. Phase 2 \u2014 Piloting & Exchange (M6\u201318): Each partner runs 4 local pilot actions (8\u201312 sessions each) with groups of 30 young participants, testing the toolkit in real settings. Cross-country youth exchanges (Palermo M10, Strasbourg M14) enable peer learning and joint evaluation. Data on participant outcomes (inclusion, self-efficacy, intercultural competence) is collected using pre/post validated instruments. A mid-term review meeting (Thessaloniki M12) adjusts methodology based on evidence. Phase 3 \u2014 Validation & Scale (M16\u201324): Results are analysed, the toolkit is refined, and a Policy Brief with recommendations is published. Multiplier events in each country disseminate findings to 200+ professionals. All outputs are released under Creative Commons on a multilingual digital platform. The transnational dimension is indispensable: comparative data across 4 national contexts strengthens validity, joint exchanges build a lasting community of practice, and shared intellectual outputs achieve scale impossible at national level.';

    WC.forEach(c => updateWC(c));

    // Init calculator with demo data
    calcInitialized = false;
    calcNeedsReinit = false;
    ensureCalcInit();

    // Now populate Calculator state with activities
    const cs = Calculator.getCalcState();
    const pts = cs.partners;
    const st = Calculator;

    // Routes (real approximate distances)
    if (pts.length >= 4) {
      st._setRouteBand(pts[0].id, pts[1].id, 3); // Salamanca\u2013Palermo ~1600km (500-1999)
      st._setRouteBand(pts[0].id, pts[2].id, 3); // Salamanca\u2013Strasbourg ~1200km
      st._setRouteBand(pts[0].id, pts[3].id, 4); // Salamanca\u2013Thessaloniki ~2400km (2000-2999)
      st._setRouteBand(pts[1].id, pts[2].id, 3); // Palermo\u2013Strasbourg ~1400km
      st._setRouteBand(pts[1].id, pts[3].id, 3); // Palermo\u2013Thessaloniki ~900km
      st._setRouteBand(pts[2].id, pts[3].id, 4); // Strasbourg\u2013Thessaloniki ~2100km (2000-2999)
    }

    // Extra destination: Brussels (EACEA)
    st._addExtraDest();
    const edState = Calculator.getCalcState();
    if (edState.extraDests.length > 0) {
      st._setExtraDest(0, 'name', 'Brussels (EACEA)');
      st._setExtraDest(0, 'country', 'Belgium');
      if (pts.length >= 4) {
        st._setRouteBand(pts[0].id, edState.extraDests[0].id, 3); // Salamanca\u2013Brussels ~1500km
        st._setRouteBand(pts[1].id, edState.extraDests[0].id, 3); // Palermo\u2013Brussels ~1700km
        st._setRouteBand(pts[2].id, edState.extraDests[0].id, 2); // Strasbourg\u2013Brussels ~500km (100-499)
        st._setRouteBand(pts[3].id, edState.extraDests[0].id, 4); // Thessaloniki\u2013Brussels ~2000km
      }
    }

    // WPs & activities
    const tmpDiv = document.createElement('div');
    st.renderMergedWPs(tmpDiv);

    // WP1: Management
    const wps = Calculator.getCalcState().wps;
    if (wps[0] && wps[0].activities[0]) {
      st._setAct(0, wps[0].activities[0].id, 'rate_applicant', 600);
      st._setAct(0, wps[0].activities[0].id, 'rate_partner', 300);
    }
    // WP1: 4 Transnational meetings
    st._addActivity(0, 'meeting'); st._addActivity(0, 'meeting'); st._addActivity(0, 'meeting');
    // WP1: Local workshops
    st._addActivity(0, 'local_ws');

    let cs2 = Calculator.getCalcState().wps;
    // Kick-off (idx 1 in WP1 activities, after mgmt)
    if (cs2[0]?.activities[1]) { const a = cs2[0].activities[1]; st._setActSubtype(0, a.id, 'Kick-off meeting'); st._setAct(0, a.id, 'pax', 2); st._setAct(0, a.id, 'days', 4); }
    // Mid-term 1 (idx 2)
    if (cs2[0]?.activities[2]) { const a = cs2[0].activities[2]; st._setActSubtype(0, a.id, 'Mid-term meeting'); st._setAct(0, a.id, 'pax', 2); st._setAct(0, a.id, 'days', 4); st._setActHost(0, a.id, pts[1]?.id); }
    // Mid-term 2 (idx 3)
    if (cs2[0]?.activities[3]) { const a = cs2[0].activities[3]; st._setActSubtype(0, a.id, 'Mid-term meeting'); st._setAct(0, a.id, 'pax', 2); st._setAct(0, a.id, 'days', 4); st._setActHost(0, a.id, pts[2]?.id); }
    // Final (idx 4)
    if (cs2[0]?.activities[4]) { const a = cs2[0].activities[4]; st._setActSubtype(0, a.id, 'Final meeting'); st._setAct(0, a.id, 'pax', 2); st._setAct(0, a.id, 'days', 5); st._setActHost(0, a.id, pts[3]?.id); }
    // Local Workshop WP1 (idx 5)
    // leave default (8 pax, 6 sessions, 50€)

    // WP2: LTTA Training + Study visit + IO Toolkit + IO Methodological guide
    st._addActivity(1, 'ltta'); st._addActivity(1, 'ltta');
    st._addActivity(1, 'io'); st._addActivity(1, 'io');

    cs2 = Calculator.getCalcState().wps;
    // Training mobility (idx 0 of WP2)
    if (cs2[1]?.activities[0]) { const a = cs2[1].activities[0]; st._setActSubtype(1, a.id, 'Training mobility'); st._setAct(1, a.id, 'pax', 4); st._setAct(1, a.id, 'days', 6); st._setActHost(1, a.id, pts[1]?.id); }
    // Study visit (idx 1)
    if (cs2[1]?.activities[1]) { const a = cs2[1].activities[1]; st._setActSubtype(1, a.id, 'Study visit mobility'); st._setAct(1, a.id, 'pax', 4); st._setAct(1, a.id, 'days', 6); st._setActHost(1, a.id, pts[2]?.id); }
    // Toolkit IO (idx 2)
    if (cs2[1]?.activities[2]) { st._setActSubtype(1, cs2[1].activities[2].id, 'Toolkit'); }
    // Methodological guide IO (idx 3)
    if (cs2[1]?.activities[3]) { st._setActSubtype(1, cs2[1].activities[3].id, 'Methodological guide'); }

    // WP3: Training mobility (big) + Training mobility + Volunteering + ME + Local WS
    st._addActivity(2, 'ltta'); st._addActivity(2, 'ltta'); st._addActivity(2, 'ltta');
    st._addActivity(2, 'me'); st._addActivity(2, 'local_ws');

    cs2 = Calculator.getCalcState().wps;
    // Training mobility big (idx 0 of WP3)
    if (cs2[2]?.activities[0]) { const a = cs2[2].activities[0]; st._setActSubtype(2, a.id, 'Training mobility'); st._setAct(2, a.id, 'pax', 10); st._setAct(2, a.id, 'days', 8); }
    // Training mobility 2 (idx 1)
    if (cs2[2]?.activities[1]) { const a = cs2[2].activities[1]; st._setActSubtype(2, a.id, 'Training mobility'); st._setAct(2, a.id, 'pax', 4); st._setAct(2, a.id, 'days', 6); st._setActHost(2, a.id, pts[3]?.id); }
    // Volunteering (idx 2)
    if (cs2[2]?.activities[2]) { const a = cs2[2].activities[2]; st._setActSubtype(2, a.id, 'Volunteering mobility'); st._setAct(2, a.id, 'pax', 8); st._setAct(2, a.id, 'days', 50); }
    // ME (idx 3) - 30 local pax per partner
    // Local WS community (idx 4)
    if (cs2[2]?.activities[4]) { st._setActSubtype(2, cs2[2].activities[4].id, 'Community workshop'); }

    // WP4: Dissemination + Website + Group mobility
    st._addActivity(3, 'campaign'); st._addActivity(3, 'website'); st._addActivity(3, 'ltta');

    cs2 = Calculator.getCalcState().wps;
    // Website (idx 1 of WP4)
    if (cs2[3]?.activities[1]) { st._setActSubtype(3, cs2[3].activities[1].id, 'Project website'); }
    // Group mobility (idx 2)
    if (cs2[3]?.activities[2]) { const a = cs2[3].activities[2]; st._setActSubtype(3, a.id, 'Group mobility'); st._setAct(3, a.id, 'pax', 4); st._setAct(3, a.id, 'days', 3); }

    setStep(0);
    Toast.show('Demo cargada: ARISE KA3-Youth \u2014 4 socios, 4 WPs', 'ok');
  }

  function openProject(id) {
    // Initialize intake without resetting step
    if (!initialized) {
      initialized = true;
      renderStepNav();
      bindEvents();
      loadPrograms();
    }
    // Show intake panel
    document.querySelectorAll('#content-area .panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('panel-intake');
    if (panel) panel.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.route === 'intake');
    });
    location.hash = 'intake';
    document.getElementById('topbar-title').textContent = 'Intake';
    // Load project and go to step 0 (Proyecto)
    loadFromServer(id, 0);
  }

  function _setProgram(p) {
    selectedProgram = p;
    if (p) {
      if (!programs.find(pr => pr.id === p.id)) programs.push(p);
    }
  }

  function hasUnsavedChanges() { return _dirty; }

  return { init, startNew, openProject, _setProgram, _calcNav: calcNav, _preloadDemo: preloadDemo, _loadProject: loadFromServer, hasUnsavedChanges };
})();
