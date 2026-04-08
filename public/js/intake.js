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

  /* ── Word counter config ─────────────────────────────────────── */
  const WC = [
    { ta: 'intake-ctx-prob', bar: 'intake-wb-prob', badge: 'intake-wc-prob', min: 200, max: 500 },
    { ta: 'intake-ctx-tgt',  bar: 'intake-wb-tgt',  badge: 'intake-wc-tgt',  min: 150, max: 400 },
    { ta: 'intake-ctx-app',  bar: 'intake-wb-app',  badge: 'intake-wc-app',  min: 200, max: 500 },
  ];

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    if (initialized) {
      loadServerProjects();
      return;
    }
    initialized = true;
    bindEvents();
    loadPrograms();
    loadServerProjects();
  }

  function startNew() {
    init();
    resetForm();
    setStep(0);
  }

  /* ── Event binding ───────────────────────────────────────────── */
  function bindEvents() {
    // Step navigation
    document.querySelectorAll('#intake-step-nav [data-step]').forEach(el => {
      el.addEventListener('click', () => {
        const s = parseInt(el.dataset.step);
        if (s <= step) setStep(s);
      });
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

    // Duration select
    const sel = document.getElementById('intake-f-dur');
    if (sel) {
      for (let m = 12; m <= 24; m++) {
        const o = document.createElement('option');
        o.value = m; o.textContent = m + ' meses';
        if (m === 24) o.selected = true;
        sel.appendChild(o);
      }
    }

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

    // Set date constraints
    const startInput = document.getElementById('intake-f-start');
    if (startInput) {
      startInput.min = toDateStr(p.start_date_min);
      startInput.max = toDateStr(p.start_date_max);
      if (!startInput.value) startInput.value = toDateStr(p.start_date_min);
    }

    // Duration range
    const durSel = document.getElementById('intake-f-dur');
    if (durSel && p.duration_min_months && p.duration_max_months) {
      durSel.innerHTML = '';
      for (let m = p.duration_min_months; m <= p.duration_max_months; m++) {
        const o = document.createElement('option');
        o.value = m; o.textContent = m + ' meses';
        if (m === p.duration_max_months) o.selected = true;
        durSel.appendChild(o);
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

  async function loadFromServer(id) {
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
      setStep(0);
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
        Toast.show('Proyecto guardado en servidor', 'ok');
      }
      loadServerProjects();
    } catch (err) {
      Toast.show('Error: ' + (err.message || err), 'err');
    }
  }

  /* ── Step navigation ─────────────────────────────────────────── */
  function setStep(s) {
    document.querySelectorAll('#panel-intake .intake-step').forEach((p, i) => {
      p.style.display = i === s ? 'block' : 'none';
    });

    for (let i = 0; i <= 3; i++) {
      const dot = document.getElementById('intake-sd' + i);
      const lbl = document.getElementById('intake-sl' + i);
      const con = i < 3 ? document.getElementById('intake-sc' + i) : null;

      dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-headline border-2 transition-all';
      if (i === s) {
        dot.className += ' border-primary bg-primary text-white';
        dot.textContent = i + 1;
        lbl.className = 'font-headline text-xs font-bold uppercase tracking-widest text-primary transition-colors';
      } else if (i < s) {
        dot.className += ' border-primary bg-primary/10 text-primary';
        dot.textContent = '\u2713';
        lbl.className = 'font-headline text-xs font-bold uppercase tracking-widest text-on-surface transition-colors';
      } else {
        dot.className += ' border-outline-variant bg-surface text-on-surface-variant';
        dot.textContent = i + 1;
        lbl.className = 'font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors';
      }
      if (con) con.className = i < s
        ? 'flex-1 h-px bg-primary mx-3 transition-colors'
        : 'flex-1 h-px bg-outline-variant mx-3 transition-colors';
    }

    step = s;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function nextStep() {
    if (!validate(step)) return;
    if (step === 2) buildSummary();
    setStep(step + 1);
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
    if (s === 2) {
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

  /* ── Partners ────────────────────────────────────────────────── */
  function renderPartners() {
    const list = document.getElementById('intake-pt-list');
    if (!list) return;
    list.innerHTML = '';
    partners.forEach((p, i) => {
      const isApp = i === 0;
      const row = document.createElement('div');
      row.className = 'grid gap-2 items-center py-2 border-b border-outline-variant/50';
      row.style.gridTemplateColumns = '28px 1fr 100px 110px 80px 32px';
      row.innerHTML = `
        <span class="text-xs font-bold text-on-surface-variant text-center">${i + 1}</span>
        <input type="text" placeholder="Nombre" value="${esc(p.name)}" data-idx="${i}" data-field="name"
          class="px-2.5 py-2 rounded-lg bg-white border border-outline-variant text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-secondary-fixed outline-none transition-all">
        <input type="text" placeholder="Ciudad" value="${esc(p.city)}" data-idx="${i}" data-field="city"
          class="px-2.5 py-2 rounded-lg bg-white border border-outline-variant text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-secondary-fixed outline-none transition-all">
        <input type="text" placeholder="Pa\u00EDs" value="${esc(p.country)}" data-idx="${i}" data-field="country"
          class="px-2.5 py-2 rounded-lg bg-white border border-outline-variant text-on-surface text-sm focus:border-primary focus:ring-2 focus:ring-secondary-fixed outline-none transition-all">
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

    // Bind remove
    list.querySelectorAll('.intake-remove-partner').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        if (idx === 0) return;
        partners.splice(idx, 1);
        partners.forEach((p, j) => { p.order_index = j + 1; p.role = j === 0 ? 'applicant' : 'partner'; });
        renderPartners();
      });
    });
  }

  function addPartner() {
    pCounter++;
    partners.push({ _local: pCounter, name: '', city: '', country: '', role: 'partner', order_index: partners.length + 1 });
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

  return { init, startNew };
})();
