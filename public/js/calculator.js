/* ═══════════════════════════════════════════════════════════════
   Calculator — Budget wizard for Erasmus+ projects (5 steps)
   Step 0: Project  |  Step 1: Parameters  |  Step 2: Work Packages
   Step 3: Financing  |  Step 4: Results
   ═══════════════════════════════════════════════════════════════ */

const Calculator = (() => {
  let initialized = false;
  let step = 0;
  const TOTAL_STEPS = 5;

  // Cached state
  let projectId = null;
  let project = null;
  let partners = [];
  let partnerRates = [];
  let workerRates = [];
  let routes = [];
  let workPackages = [];

  const ACT_TYPES = {
    mgmt:          { label:'Management',              icon:'settings',           color:'#6B7280' },
    meeting:       { label:'Transnational Meeting',   icon:'groups',             color:'#1D4ED8' },
    ltta:          { label:'LTTA / Mobility',         icon:'flight_takeoff',     color:'#0F766E' },
    io:            { label:'Intellectual Output',      icon:'menu_book',          color:'#7C3AED' },
    me:            { label:'Multiplier Event',         icon:'campaign',           color:'#BE185D' },
    local_ws:      { label:'Local Workshop',           icon:'school',             color:'#B45309' },
    campaign:      { label:'Campaign',                 icon:'share',              color:'#065F46' },
    website:       { label:'Website',                  icon:'language',           color:'#1D4ED8' },
    artistic:      { label:'Artistic Fees',            icon:'palette',            color:'#BE185D' },
    extraordinary: { label:'Extraordinary Costs',      icon:'warning',            color:'#D97706' },
    equipment:     { label:'Equipment',                icon:'devices',            color:'#0369A1' },
    consumables:   { label:'Consumables',              icon:'science',            color:'#0F766E' },
    other:         { label:'Other Costs',              icon:'more_horiz',         color:'#6B7280' },
  };

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    if (initialized) { setStep(step); loadProjects(); return; }
    initialized = true;
    bindEvents();
    setStep(0);
    loadProjects();
  }

  function bindEvents() {
    document.querySelectorAll('#calc-step-nav [data-step]').forEach(el => {
      el.addEventListener('click', () => {
        const s = parseInt(el.dataset.step);
        if (s <= step || (projectId && s <= step + 1)) setStep(s);
      });
    });
    document.querySelectorAll('.calc-btn-next').forEach(b => b.addEventListener('click', () => nextStep()));
    document.querySelectorAll('.calc-btn-prev').forEach(b => b.addEventListener('click', () => setStep(step - 1)));
  }

  /* ── Step navigation ───────────────────────────────────────── */
  function setStep(s) {
    document.querySelectorAll('#panel-calculator .calc-step').forEach((p, i) => {
      p.style.display = i === s ? 'block' : 'none';
    });
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const dot = document.getElementById('calc-sd' + i);
      const lbl = document.getElementById('calc-sl' + i);
      const con = i < TOTAL_STEPS - 1 ? document.getElementById('calc-sc' + i) : null;
      dot.className = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-headline border-2 transition-all';
      if (i === s) {
        dot.className += ' border-primary bg-primary text-white';
        dot.textContent = i + 1;
        if (lbl) lbl.className = 'font-headline text-xs font-bold uppercase tracking-widest text-primary transition-colors hidden sm:inline';
      } else if (i < s) {
        dot.className += ' border-primary bg-primary/10 text-primary';
        dot.textContent = '\u2713';
        if (lbl) lbl.className = 'font-headline text-xs font-bold uppercase tracking-widest text-on-surface transition-colors hidden sm:inline';
      } else {
        dot.className += ' border-outline-variant bg-surface text-on-surface-variant';
        dot.textContent = i + 1;
        if (lbl) lbl.className = 'font-headline text-xs font-bold uppercase tracking-widest text-on-surface-variant transition-colors hidden sm:inline';
      }
      if (con) con.className = i < s ? 'flex-1 h-px bg-primary mx-2 transition-colors' : 'flex-1 h-px bg-outline-variant mx-2 transition-colors';
    }
    step = s;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onStepEnter(s);
  }

  function nextStep() {
    if (step === 0 && !projectId) { Toast.show('Select a project first', 'err'); return; }
    setStep(step + 1);
  }

  async function onStepEnter(s) {
    if (s === 0) loadProjects();
    if (s === 1 && projectId) await loadParametersData();
    if (s === 2 && projectId) await loadWorkPackages();
    if (s === 3 && projectId) renderFinancing();
    if (s === 4 && projectId) renderResults();
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 0 — Project Selection
     ══════════════════════════════════════════════════════════════ */

  async function loadProjects() {
    const c = document.getElementById('calc-project-list');
    try {
      const projects = await API.get('/intake/projects');
      if (!projects || !projects.length) { c.innerHTML = '<p class="text-xs text-on-surface-variant">No projects. Create one in Intake first.</p>'; return; }
      c.innerHTML = '';
      projects.forEach(p => {
        const sel = p.id === projectId;
        const card = document.createElement('div');
        card.className = `calc-proj-card flex items-center gap-3 p-4 rounded-xl border-2 ${sel ? 'border-primary' : 'border-outline-variant'} bg-white cursor-pointer transition-all hover:shadow-md`;
        card.dataset.pid = p.id;
        card.innerHTML = `
          <div class="w-5 h-5 rounded-full border-2 ${sel ? 'border-primary bg-primary' : 'border-outline-variant bg-surface'} flex items-center justify-center flex-shrink-0">
            ${sel ? '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>' : ''}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-headline text-base font-bold text-primary">${esc(p.acronym || p.name)}</div>
            <div class="text-xs text-on-surface-variant mt-0.5">${esc(p.type || '')} &middot; ${esc(p.status || 'draft')}</div>
          </div>
          <span class="text-[10px] text-on-surface-variant">${fmtDate(p.updated_at || p.created_at)}</span>`;
        card.addEventListener('click', () => selectProject(p));
        c.appendChild(card);
      });
    } catch (err) { c.innerHTML = `<p class="text-xs text-red-600">${err.message || err}</p>`; }
  }

  async function selectProject(p) {
    projectId = p.id;
    project = p;
    // Update radio visuals
    document.querySelectorAll('.calc-proj-card').forEach(c => {
      const isSel = c.dataset.pid === p.id;
      c.classList.toggle('border-primary', isSel);
      c.classList.toggle('border-outline-variant', !isSel);
      const dot = c.querySelector('div > div:first-child');
      dot.classList.toggle('border-primary', isSel); dot.classList.toggle('bg-primary', isSel);
      dot.classList.toggle('border-outline-variant', !isSel); dot.classList.toggle('bg-surface', !isSel);
      dot.innerHTML = isSel ? '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>' : '';
    });
    // Show details
    const det = document.getElementById('calc-project-details');
    det.classList.remove('hidden');
    const infoFields = [
      ['Type', p.type || '\u2014'],
      ['Start date', fmtDate(p.start_date)],
      ['Duration', p.duration_months ? p.duration_months + ' months' : '\u2014'],
      ['EU Grant', p.eu_grant ? Number(p.eu_grant).toLocaleString('en') + ' \u20AC' : '\u2014'],
      ['Co-financing', p.cofin_pct ? p.cofin_pct + '%' : '80%'],
      ['Status', p.status || 'draft'],
    ];
    document.getElementById('calc-project-info-grid').innerHTML = infoFields.map(([label, val]) => `
      <div class="bg-surface-container-low border border-outline-variant/50 rounded-lg p-3">
        <div class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">${label}</div>
        <div class="font-headline text-sm font-bold text-primary">${val}</div>
      </div>`).join('');
    // Load partners
    try {
      partners = await API.get('/intake/projects/' + p.id + '/partners') || [];
      const pl = document.getElementById('calc-partner-list');
      pl.innerHTML = partners.map((pt, i) => `
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant/30 bg-white">
          <span class="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">${i + 1}</span>
          <span class="text-sm font-semibold text-on-surface">${esc(pt.name || 'Partner ' + (i + 1))}</span>
          <span class="text-xs text-on-surface-variant">${esc(pt.country || '')} ${esc(pt.city ? '· ' + pt.city : '')}</span>
          ${i === 0 ? '<span class="ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary-fixed/20 text-primary">Applicant</span>' : ''}
        </div>`).join('');
    } catch { partners = []; }
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 1 — Parameters (Per Diem, Worker Rates, Routes)
     ══════════════════════════════════════════════════════════════ */

  async function loadParametersData() {
    await Promise.all([loadPerDiemTable(), loadWorkerTable(), loadRouteTable()]);
  }

  // ── Per Diem ──
  async function loadPerDiemTable() {
    const c = document.getElementById('calc-perdiem-table');
    try {
      partnerRates = await API.get(`/calculator/projects/${projectId}/partner-rates`) || [];
      if (!partnerRates.length) { c.innerHTML = '<p class="text-xs text-on-surface-variant italic">No partner rates found. Partners need to be defined in Intake.</p>'; return; }
      c.innerHTML = `<table class="w-full text-sm border-collapse">
        <thead><tr class="bg-surface-container-low text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          <th class="px-3 py-2 text-left">Partner</th>
          <th class="px-3 py-2 text-right">Accommodation (&euro;/night)</th>
          <th class="px-3 py-2 text-right">Subsistence (&euro;/day)</th>
          <th class="px-3 py-2 text-right">Total/day</th>
        </tr></thead>
        <tbody>${partnerRates.map(r => {
          const total = (Number(r.accommodation_rate) || 0) + (Number(r.subsistence_rate) || 0);
          return `<tr class="border-t border-outline-variant/30">
            <td class="px-3 py-2 font-semibold">${esc(r.partner_name)}</td>
            <td class="px-3 py-2 text-right"><input type="number" class="w-20 px-2 py-1 text-right border border-outline-variant rounded text-sm" value="${r.accommodation_rate || 0}" data-pr-id="${r.id}" data-field="accommodation_rate"></td>
            <td class="px-3 py-2 text-right"><input type="number" class="w-20 px-2 py-1 text-right border border-outline-variant rounded text-sm" value="${r.subsistence_rate || 0}" data-pr-id="${r.id}" data-field="subsistence_rate"></td>
            <td class="px-3 py-2 text-right font-bold text-primary">&euro;${total}</td>
          </tr>`; }).join('')}
        </tbody></table>`;
      // Bind auto-save
      c.querySelectorAll('input[data-pr-id]').forEach(inp => {
        inp.addEventListener('change', async () => {
          const id = inp.dataset.prId;
          const field = inp.dataset.field;
          try { await API.patch(`/calculator/partner-rates/${id}`, { [field]: Number(inp.value) || 0 }); }
          catch (err) { Toast.show('Error saving: ' + (err.message || err), 'error'); }
          loadPerDiemTable(); // refresh totals
        });
      });
    } catch (err) { c.innerHTML = `<p class="text-xs text-red-600">${err.message || err}</p>`; }
  }

  // ── Worker Rates ──
  async function loadWorkerTable() {
    const c = document.getElementById('calc-worker-table');
    try {
      workerRates = await API.get(`/calculator/projects/${projectId}/worker-rates`) || [];
      if (!workerRates.length) { c.innerHTML = '<p class="text-xs text-on-surface-variant italic">No worker rates found.</p>'; return; }
      c.innerHTML = `<table class="w-full text-sm border-collapse">
        <thead><tr class="bg-surface-container-low text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          <th class="px-3 py-2 text-left">Partner</th>
          <th class="px-3 py-2 text-left">Category</th>
          <th class="px-3 py-2 text-right">Rate (&euro;/day)</th>
        </tr></thead>
        <tbody>${workerRates.map(w => `
          <tr class="border-t border-outline-variant/30">
            <td class="px-3 py-2">${esc(w.partner_name)}</td>
            <td class="px-3 py-2 font-semibold">${esc(w.category)}</td>
            <td class="px-3 py-2 text-right"><input type="number" class="w-20 px-2 py-1 text-right border border-outline-variant rounded text-sm" value="${w.rate || 0}" data-wr-id="${w.id}"></td>
          </tr>`).join('')}
        </tbody></table>`;
      c.querySelectorAll('input[data-wr-id]').forEach(inp => {
        inp.addEventListener('change', async () => {
          try { await API.patch(`/calculator/worker-rates/${inp.dataset.wrId}`, { rate: Number(inp.value) || 0 }); }
          catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
        });
      });
    } catch (err) { c.innerHTML = `<p class="text-xs text-red-600">${err.message || err}</p>`; }
  }

  // ── Routes ──
  async function loadRouteTable() {
    const c = document.getElementById('calc-route-table');
    try {
      routes = await API.get(`/calculator/projects/${projectId}/routes`) || [];
      if (!routes.length) { c.innerHTML = '<p class="text-xs text-on-surface-variant italic">No routes yet. Click "+ Add Route".</p>'; return; }
      c.innerHTML = `<table class="w-full text-sm border-collapse">
        <thead><tr class="bg-surface-container-low text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          <th class="px-3 py-2 text-left">From</th>
          <th class="px-3 py-2 text-left">To</th>
          <th class="px-3 py-2 text-right">Distance (km)</th>
          <th class="px-3 py-2 text-center">Eco</th>
          <th class="px-3 py-2">Band</th>
          <th class="px-3 py-2 text-right">Rate (&euro;)</th>
          <th class="px-3 py-2"></th>
        </tr></thead>
        <tbody>${routes.map(r => {
          const band = getBandLabel(r.distance_km);
          const rate = getBandRate(r.distance_km, r.eco_travel);
          return `<tr class="border-t border-outline-variant/30" data-rid="${r.id}">
            <td class="px-3 py-2"><input type="text" class="w-full px-2 py-1 border border-outline-variant rounded text-sm" value="${esc(r.endpoint_a || '')}" data-rf="endpoint_a"></td>
            <td class="px-3 py-2"><input type="text" class="w-full px-2 py-1 border border-outline-variant rounded text-sm" value="${esc(r.endpoint_b || '')}" data-rf="endpoint_b"></td>
            <td class="px-3 py-2 text-right"><input type="number" class="w-20 px-2 py-1 text-right border border-outline-variant rounded text-sm" value="${r.distance_km || 0}" data-rf="distance_km"></td>
            <td class="px-3 py-2 text-center"><input type="checkbox" class="rounded" ${r.eco_travel ? 'checked' : ''} data-rf="eco_travel"></td>
            <td class="px-3 py-2 text-xs text-on-surface-variant">${band}</td>
            <td class="px-3 py-2 text-right font-bold text-primary">&euro;${rate}</td>
            <td class="px-3 py-1"><button class="route-del-btn p-1 rounded hover:bg-red-50 text-on-surface-variant hover:text-red-600"><span class="material-symbols-outlined text-sm">delete</span></button></td>
          </tr>`; }).join('')}
        </tbody></table>`;

      // Bind auto-save on routes
      c.querySelectorAll('tr[data-rid]').forEach(row => {
        const rid = row.dataset.rid;
        row.querySelectorAll('input[data-rf]').forEach(inp => {
          const ev = inp.type === 'checkbox' ? 'change' : 'change';
          inp.addEventListener(ev, async () => {
            const field = inp.dataset.rf;
            const val = field === 'eco_travel' ? (inp.checked ? 1 : 0) : (inp.type === 'number' ? (Number(inp.value) || 0) : inp.value);
            try { await API.patch(`/calculator/routes/${rid}`, { [field]: val }); loadRouteTable(); }
            catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
          });
        });
        row.querySelector('.route-del-btn')?.addEventListener('click', async () => {
          const ok = await Modal.show('Delete this route?');
          if (!ok) return;
          try { await API.del(`/calculator/routes/${rid}`); loadRouteTable(); Toast.show('Deleted', 'ok'); }
          catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
        });
      });

      // Add route button
      document.getElementById('calc-btn-add-route')?.removeEventListener('click', onAddRoute);
      document.getElementById('calc-btn-add-route')?.addEventListener('click', onAddRoute);
    } catch (err) { c.innerHTML = `<p class="text-xs text-red-600">${err.message || err}</p>`; }
  }

  async function onAddRoute() {
    try {
      await API.post(`/calculator/projects/${projectId}/routes`, { endpoint_a: '', endpoint_b: '', distance_km: 0, eco_travel: 0 });
      loadRouteTable();
    } catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 2 — Work Packages & Activities
     ══════════════════════════════════════════════════════════════ */

  async function loadWorkPackages() {
    const c = document.getElementById('calc-wp-list');
    c.innerHTML = '<p class="text-xs text-on-surface-variant">Loading...</p>';
    try {
      workPackages = await API.get(`/calculator/projects/${projectId}/work-packages`) || [];
      if (!workPackages.length) { c.innerHTML = '<p class="text-xs text-on-surface-variant py-4 text-center">No work packages. Click "+ Add WP".</p>'; }
      else { c.innerHTML = ''; workPackages.forEach(wp => c.appendChild(renderWP(wp))); }
      // Bind add WP
      document.getElementById('calc-btn-add-wp')?.removeEventListener('click', onAddWP);
      document.getElementById('calc-btn-add-wp')?.addEventListener('click', onAddWP);
      updateLiveBar();
    } catch (err) { c.innerHTML = `<p class="text-xs text-red-600">${err.message || err}</p>`; }
  }

  function renderWP(wp) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-xl border-2 border-outline-variant overflow-hidden transition-all';
    card.dataset.wpId = wp.id;
    card.innerHTML = `
      <div class="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-surface-container-low/50 transition-colors wp-hdr">
        <span class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[11px] font-extrabold text-white flex-shrink-0">${esc(wp.code || 'WP')}</span>
        <div class="flex-1 min-w-0">
          <div class="font-headline text-sm font-bold text-on-surface">${esc(wp.title || 'Untitled')}</div>
        </div>
        <span class="wp-total text-sm font-bold text-primary">&mdash;</span>
        <button class="wp-edit p-1 rounded hover:bg-primary/10 text-on-surface-variant hover:text-primary"><span class="material-symbols-outlined text-lg">edit</span></button>
        <button class="wp-del p-1 rounded hover:bg-red-50 text-on-surface-variant hover:text-red-600"><span class="material-symbols-outlined text-lg">delete</span></button>
        <span class="material-symbols-outlined text-on-surface-variant wp-chv transition-transform">expand_more</span>
      </div>
      <div class="wp-body hidden border-t border-outline-variant/30">
        <div class="act-list px-5 py-3 space-y-2"></div>
        <div class="px-5 py-3 border-t border-outline-variant/10">
          <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Add activity</div>
          <div class="flex flex-wrap gap-1.5 act-picker"></div>
        </div>
      </div>`;

    // Toggle
    card.querySelector('.wp-hdr').addEventListener('click', (e) => {
      if (e.target.closest('.wp-edit') || e.target.closest('.wp-del')) return;
      const body = card.querySelector('.wp-body');
      const chv = card.querySelector('.wp-chv');
      const wasHidden = body.classList.toggle('hidden');
      chv.style.transform = wasHidden ? '' : 'rotate(180deg)';
      card.classList.toggle('border-primary', !wasHidden);
      card.classList.toggle('border-outline-variant', wasHidden);
      if (!wasHidden) loadActivities(wp.id, card);
    });
    card.querySelector('.wp-edit').addEventListener('click', async () => {
      const title = await Modal.show('Edit WP title:', { input: true, defaultVal: wp.title || '' });
      if (title === null) return;
      try { await API.patch(`/calculator/work-packages/${wp.id}`, { title }); Toast.show('Updated', 'ok'); loadWorkPackages(); }
      catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
    });
    card.querySelector('.wp-del').addEventListener('click', async () => {
      const ok = await Modal.show('Delete this WP and all activities?');
      if (!ok) return;
      try { await API.del(`/calculator/work-packages/${wp.id}`); Toast.show('Deleted', 'ok'); loadWorkPackages(); }
      catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
    });

    // Activity picker
    const picker = card.querySelector('.act-picker');
    Object.entries(ACT_TYPES).forEach(([type, def]) => {
      const btn = document.createElement('button');
      btn.className = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-dashed border-outline-variant/60 hover:border-primary hover:bg-primary/5 transition-colors';
      btn.innerHTML = `<span class="material-symbols-outlined text-sm" style="color:${def.color}">${def.icon}</span> ${def.label}`;
      btn.addEventListener('click', () => addActivity(wp.id, type, card));
      picker.appendChild(btn);
    });

    return card;
  }

  async function onAddWP() {
    const title = await Modal.show('Work Package title:', { input: true });
    if (!title) return;
    try { await API.post(`/calculator/projects/${projectId}/work-packages`, { title, category: 'implementation' }); Toast.show('Created', 'ok'); loadWorkPackages(); }
    catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
  }

  async function loadActivities(wpId, card) {
    const list = card.querySelector('.act-list');
    list.innerHTML = '<p class="text-xs text-on-surface-variant">Loading...</p>';
    try {
      const acts = await API.get(`/calculator/work-packages/${wpId}/activities`) || [];
      if (!acts.length) { list.innerHTML = '<p class="text-xs text-on-surface-variant text-center py-2">No activities yet.</p>'; return; }
      list.innerHTML = '';
      acts.forEach(act => list.appendChild(renderActivityCard(act, wpId, card)));
    } catch (err) { list.innerHTML = `<p class="text-xs text-red-600">${err.message || err}</p>`; }
  }

  function renderActivityCard(act, wpId, wpCard) {
    const def = ACT_TYPES[act.type] || { label: act.type, icon: 'help', color: '#888' };
    const row = document.createElement('div');
    row.className = 'rounded-lg border border-outline-variant/30 bg-surface-container-low/30 p-3';
    row.innerHTML = `
      <div class="flex items-center gap-2 mb-1">
        <span class="material-symbols-outlined text-sm" style="color:${def.color}">${def.icon}</span>
        <span class="text-[10px] font-bold uppercase tracking-widest" style="color:${def.color}">${def.label}</span>
        <span class="text-xs text-on-surface flex-1 truncate ml-1">${esc(act.label || '')}</span>
        <button class="act-edit p-1 rounded hover:bg-primary/10 text-on-surface-variant hover:text-primary"><span class="material-symbols-outlined text-sm">edit</span></button>
        <button class="act-del p-1 rounded hover:bg-red-50 text-on-surface-variant hover:text-red-600"><span class="material-symbols-outlined text-sm">delete</span></button>
      </div>`;

    row.querySelector('.act-edit').addEventListener('click', async () => {
      const label = await Modal.show('Edit label:', { input: true, defaultVal: act.label || '' });
      if (label === null) return;
      try { await API.patch(`/calculator/activities/${act.id}`, { label }); Toast.show('Updated', 'ok'); loadActivities(wpId, wpCard); }
      catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
    });
    row.querySelector('.act-del').addEventListener('click', async () => {
      const ok = await Modal.show('Delete this activity?');
      if (!ok) return;
      try { await API.del(`/calculator/activities/${act.id}`); Toast.show('Deleted', 'ok'); loadActivities(wpId, wpCard); updateLiveBar(); }
      catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
    });
    return row;
  }

  async function addActivity(wpId, type, wpCard) {
    try {
      await API.post(`/calculator/work-packages/${wpId}/activities`, { type, label: ACT_TYPES[type]?.label || type });
      Toast.show('Activity added', 'ok');
      // Expand if not already
      const body = wpCard.querySelector('.wp-body');
      if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        wpCard.querySelector('.wp-chv').style.transform = 'rotate(180deg)';
        wpCard.classList.add('border-primary');
        wpCard.classList.remove('border-outline-variant');
      }
      loadActivities(wpId, wpCard);
      updateLiveBar();
    } catch (err) { Toast.show('Error: ' + (err.message || err), 'error'); }
  }

  async function updateLiveBar() {
    try {
      const data = await API.get(`/calculator/projects/${projectId}/budget-summary`);
      const total = data.total_budget || 0;
      const target = project?.eu_grant ? Number(project.eu_grant) / ((project.cofin_pct || 80) / 100) : 0;
      const diff = total - target;
      const pct = target > 0 ? Math.min((total / target) * 100, 100) : 0;
      document.getElementById('calc-live-total').textContent = fmt(total);
      document.getElementById('calc-live-target').textContent = fmt(target);
      document.getElementById('calc-live-diff').textContent = (diff >= 0 ? '+' : '') + fmt(diff);
      document.getElementById('calc-live-diff').style.color = diff > 0 ? '#FCA5A5' : '#86EFAC';
      document.getElementById('calc-live-pct-bar').style.width = pct + '%';
    } catch { /* ignore */ }
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 3 — Financing
     ══════════════════════════════════════════════════════════════ */

  async function renderFinancing() {
    const c = document.getElementById('calc-financing-content');
    c.innerHTML = '<p class="text-xs text-on-surface-variant">Calculating...</p>';
    try {
      const data = await API.get(`/calculator/projects/${projectId}/budget-summary`);
      const directCosts = data.total_budget || 0;
      const indirectPct = project?.indirect_pct || 7;
      const indirectCosts = directCosts * (indirectPct / 100);
      const totalCalc = directCosts + indirectCosts;
      const cofinPct = project?.cofin_pct || 80;
      const euGrant = project?.eu_grant ? Number(project.eu_grant) : 0;
      const target100 = cofinPct > 0 ? euGrant / (cofinPct / 100) : euGrant;
      const margin = target100 - totalCalc;

      c.innerHTML = `
        <div class="bg-white rounded-xl border border-outline-variant/30 p-5 mb-5">
          <div class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Budget verification</div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div class="bg-surface-container-low rounded-lg p-3">
              <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Direct costs</div>
              <div class="font-headline text-lg font-bold text-primary">${fmt(directCosts)}</div>
            </div>
            <div class="bg-surface-container-low rounded-lg p-3">
              <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">+ Indirect (${indirectPct}%)</div>
              <div class="font-headline text-lg font-bold text-primary">${fmt(indirectCosts)}</div>
            </div>
            <div class="bg-primary/10 rounded-lg p-3 border border-primary/20">
              <div class="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">= Total calculated</div>
              <div class="font-headline text-lg font-extrabold text-primary">${fmt(totalCalc)}</div>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-surface-container-low rounded-lg p-3">
              <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Target 100% project</div>
              <div class="font-headline text-lg font-bold text-on-surface">${fmt(target100)}</div>
            </div>
            <div class="rounded-lg p-3 ${margin >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
              <div class="text-[10px] font-bold uppercase tracking-widest ${margin >= 0 ? 'text-green-700' : 'text-red-700'} mb-1">Margin</div>
              <div class="font-headline text-lg font-bold ${margin >= 0 ? 'text-green-700' : 'text-red-700'}">${margin >= 0 ? '+' : ''}${fmt(margin)}</div>
            </div>
          </div>
        </div>
        <div class="bg-white rounded-xl border border-outline-variant/30 p-5">
          <div class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Co-financing split</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="bg-primary rounded-lg p-4 text-white">
              <div class="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">EU Grant (${cofinPct}%)</div>
              <div class="font-headline text-xl font-extrabold">${fmt(euGrant)}</div>
            </div>
            <div class="bg-surface-container-low rounded-lg p-4 border border-outline-variant/30">
              <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Own funds (${100 - cofinPct}%)</div>
              <div class="font-headline text-xl font-extrabold text-on-surface">${fmt(totalCalc - euGrant > 0 ? totalCalc - euGrant : 0)}</div>
            </div>
          </div>
        </div>`;
    } catch (err) { c.innerHTML = `<p class="text-xs text-red-600">${err.message || err}</p>`; }
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 4 — Results
     ══════════════════════════════════════════════════════════════ */

  async function renderResults() {
    const c = document.getElementById('calc-results-content');
    c.innerHTML = '<p class="text-xs text-on-surface-variant">Loading...</p>';
    try {
      const data = await API.get(`/calculator/projects/${projectId}/budget-summary`);
      const cats = data.by_cost_category || {};
      const wps = data.by_work_package || [];
      const total = data.total_budget || 0;
      const indirectPct = project?.indirect_pct || 7;
      const indirect = total * (indirectPct / 100);
      const grandTotal = total + indirect;

      let html = '';

      // Hero
      html += `<div class="bg-primary rounded-2xl px-6 py-5 mb-6 text-white">
        <div class="text-[10px] font-bold uppercase tracking-widest opacity-50">Total project budget</div>
        <div class="font-headline text-3xl font-extrabold mt-1">${fmt(grandTotal)}</div>
        <div class="text-xs opacity-50 mt-1">${esc(project?.name || '')} &middot; Direct ${fmt(total)} + Indirect ${fmt(indirect)}</div>
      </div>`;

      // Category breakdown
      html += sectionLabel('By cost category');
      html += '<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">';
      const catLabels = { travel:'Travel', accommodation:'Accommodation', subsistence:'Subsistence', management:'Management', intellectual_outputs:'Intellectual Outputs', multiplier_events:'Multiplier Events', local_workshops:'Local Workshops', campaigns:'Campaigns', generic:'Other Costs' };
      for (const [key, label] of Object.entries(catLabels)) {
        const val = cats[key] || 0;
        const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';
        html += `<div class="bg-surface-container-low border border-outline-variant/50 rounded-lg p-3">
          <div class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">${label}</div>
          <div class="font-headline text-sm font-bold text-primary">${fmt(val)}</div>
          <div class="h-1 rounded bg-outline-variant/30 mt-1.5 overflow-hidden"><div class="h-full rounded bg-primary" style="width:${pct}%"></div></div>
          <div class="text-[10px] text-on-surface-variant mt-1">${pct}%</div>
        </div>`;
      }
      html += '</div>';

      // WP breakdown
      if (wps.length > 0) {
        html += sectionLabel('By work package');
        html += '<div class="flex flex-col gap-2 mb-6">';
        wps.forEach(wp => {
          const pct = total > 0 ? ((wp.total / total) * 100).toFixed(1) : '0.0';
          html += `<div class="flex items-center gap-3 p-4 rounded-xl border border-outline-variant/30 bg-white">
            <span class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0">${esc(wp.code)}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-on-surface">${esc(wp.title)}</div>
              <div class="h-1 rounded bg-outline-variant/30 mt-1 overflow-hidden"><div class="h-full rounded bg-primary" style="width:${pct}%"></div></div>
            </div>
            <span class="font-headline text-sm font-bold text-primary">${fmt(wp.total)}</span>
            <span class="text-[10px] text-on-surface-variant w-12 text-right">${pct}%</span>
          </div>`;
        });
        html += '</div>';
      }

      c.innerHTML = html;
    } catch (err) { c.innerHTML = `<p class="text-xs text-red-600">${err.message || err}</p>`; }
  }

  /* ── Helpers ────────────────────────────────────────────────── */
  function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function fmt(n) { return new Intl.NumberFormat('en', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0); }
  function fmtDate(d) { if (!d) return '\u2014'; const dt = new Date(d); if (isNaN(dt)) return String(d); return dt.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
  function sectionLabel(text) { return `<div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3"><span>${text}</span><div class="flex-1 h-px bg-outline-variant"></div></div>`; }

  function getBandLabel(km) {
    km = parseInt(km) || 0;
    if (km < 10) return '-'; if (km <= 99) return '10-99'; if (km <= 499) return '100-499';
    if (km <= 1999) return '500-1999'; if (km <= 2999) return '2000-2999';
    if (km <= 3999) return '3000-3999'; if (km <= 7999) return '4000-7999'; return '8000+';
  }
  function getBandRate(km, eco) {
    km = parseInt(km) || 0;
    if (km >= 10 && km <= 99) return 23;
    if (km >= 100 && km <= 499) return eco ? 210 : 180;
    if (km >= 500 && km <= 1999) return eco ? 320 : 275;
    if (km >= 2000 && km <= 2999) return eco ? 410 : 360;
    if (km >= 3000 && km <= 3999) return eco ? 610 : 530;
    if (km >= 4000 && km <= 7999) return 820;
    if (km >= 8000) return 1500;
    return 0;
  }

  return { init };
})();
