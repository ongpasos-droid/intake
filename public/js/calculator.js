/* ═══════════════════════════════════════════════════════════════
   Calculator — Erasmus+ Budget Wizard
   ═══════════════════════════════════════════════════════════════ */

const Calculator = (() => {
  let initialized = false;
  let currentProjectId = null;
  let currentStep = -1; // -1 = project selector
  let maxReached = -1;
  let saveTimer = null;

  /* ── State ──────────────────────────────────────────────────── */
  let state = {
    project: null,
    partners: [],
    partnerRates: {},   // pid → { aloj, mant }
    workerRates: [],
    wrCounter: 0,
    routes: {},         // "min_max" → { km, green, custom_rate }
    extraDests: [],     // [{ id, name, country }]
    extraDestCounter: 0,
    wps: [],
    actCounter: 0,
    mgmt: { rate_applicant: 500, rate_partner: 250 },
  };

  /* ── Constants ──────────────────────────────────────────────── */
  const WP_COLORS = ['#1D4ED8','#B45309','#7C3AED','#0F766E','#BE185D','#065F46','#9A3412','#1E40AF','#6B21A8','#0E7490','#4D7C0F','#7F1D1D'];
  const WP_BG     = ['rgba(29,78,216,.06)','rgba(180,83,9,.06)','rgba(124,58,237,.06)','rgba(15,118,110,.06)','rgba(190,24,93,.06)','rgba(6,95,70,.06)','rgba(154,52,18,.06)','rgba(30,64,175,.06)','rgba(107,33,168,.06)','rgba(14,116,144,.06)','rgba(77,124,15,.06)','rgba(127,29,29,.06)'];

  const DISTANCE_BANDS = [
    { min:0,    max:9,    label:'< 10 km',        green:0,    std:0    },
    { min:10,   max:99,   label:'10 – 99 km',     green:56,   std:28   },
    { min:100,  max:499,  label:'100 – 499 km',   green:285,  std:211  },
    { min:500,  max:1999, label:'500 – 1999 km',  green:417,  std:309  },
    { min:2000, max:2999, label:'2000 – 2999 km', green:535,  std:395  },
    { min:3000, max:3999, label:'3000 – 3999 km', green:785,  std:580  },
    { min:4000, max:7999, label:'4000 – 7999 km', green:1188, std:1188 },
    { min:8000, max:Infinity, label:'≥ 8000 km',  green:1735, std:1735 },
  ];

  const ERASMUS_REF_RATES = [
    { label:'Grupo A', countries:['dinamarca','irlanda','luxemburgo','países bajos','austria','suecia','liechtenstein','noruega','denmark','ireland','luxembourg','netherlands','sweden'],
      manager:294, trainer:241, tech:190, admin:157 },
    { label:'Grupo B', countries:['bélgica','belgica','alemania','francia','italia','finlandia','islandia','belgium','germany','france','italy','finland','iceland'],
      manager:280, trainer:214, tech:162, admin:131 },
    { label:'Grupo C', countries:['república checa','grecia','españa','chipre','malta','portugal','eslovenia','czech','greece','spain','cyprus','slovenia'],
      manager:164, trainer:137, tech:102, admin:78 },
    { label:'Grupo D', countries:['bulgaria','estonia','croacia','letonia','lituania','hungría','polonia','rumanía','serbia','eslovaquia','macedonia','turquía','croatia','latvia','lithuania','hungary','poland','romania','slovakia','turkey'],
      manager:88, trainer:74, tech:55, admin:47 },
  ];

  const PROFILES = [
    { key:'manager',  label:'Manager',                        field:'manager'  },
    { key:'trainer',  label:'Trainer/Researcher/Youth worker', field:'trainer'  },
    { key:'tech',     label:'Technician',                     field:'tech'     },
    { key:'admin',    label:'Administrative',                 field:'admin'    },
  ];

  const PERDIEM_DEFAULTS = {
    'Grupo A': { aloj:125, mant:55 },
    'Grupo B': { aloj:115, mant:45 },
    'Grupo C': { aloj:105, mant:40 },
    'Grupo D': { aloj:95,  mant:35 },
  };

  const ACT_TYPES = {
    mgmt:       { label:'Management',           icon:'settings',        color:'#474551', bg:'rgba(71,69,81,.08)',   mobility:false, descHint:'In your own words, tell us how you plan to coordinate the project. How will you organise internal communication, monitor progress and handle reporting?' },
    meeting:    { label:'Transnational Meeting', icon:'groups',          color:'#1D4ED8', bg:'rgba(29,78,216,.08)', mobility:true,  descHint:'Tell us about this meeting in your own words. What do you want to achieve? Who will be there? What decisions or outcomes do you expect?',
      subtypes: ['Kick-off meeting','Mid-term meeting','Final meeting','Coordination meeting','Technical working meeting','Strategic planning meeting'] },
    ltta:       { label:'LTTA / Mobility',       icon:'flight_takeoff',  color:'#0F766E', bg:'rgba(15,118,110,.08)',mobility:true,  descHint:'Describe this mobility in your own words. What will participants learn? What methodology will you use? Who is the target group and what skills will they develop?',
      subtypes: ['Training mobility','Study visit mobility','Group mobility','Youth exchange mobility','Staff mobility','Job shadowing mobility','Peer learning mobility','Blended mobility','Pilot mobility','Volunteering mobility','Expert mobility','Community immersion mobility'] },
    io:         { label:'Intellectual Output',   icon:'menu_book',       color:'#7C3AED', bg:'rgba(124,58,237,.08)',mobility:false, descHint:'Tell us what you want to create. What kind of product is it (guide, toolkit, platform...)? How will you develop it and who will use it?',
      subtypes: ['Educational manual','Methodological guide','Training course / module','Toolkit','Research report / needs analysis','Digital platform / interactive tool'] },
    me:         { label:'Multiplier Event',      icon:'campaign',        color:'#BE185D', bg:'rgba(190,24,93,.08)', mobility:false, descHint:'Describe this event in your own words. What is it about? Who do you want to reach? What format are you thinking (conference, workshop, open day...)?',
      subtypes: ['Launch event','Dissemination conference','Final conference','Stakeholder event','Networking event','Public presentation event'] },
    local_ws:   { label:'Local Workshop',        icon:'school',          color:'#B45309', bg:'rgba(180,83,9,.08)',  mobility:false, descHint:'Tell us about this local activity. What topics will you cover? Who will participate? What do you hope they will take away from it?',
      subtypes: ['Training workshop','Participatory workshop','Awareness workshop','Co-creation workshop','Community workshop','Testing / pilot workshop'] },
    campaign:   { label:'Dissemination',         icon:'share',           color:'#065F46', bg:'rgba(6,95,70,.08)',   mobility:false, descHint:'How do you plan to spread the word? Which channels will you use? Who do you want to reach and what message do you want to convey?',
      subtypes: ['Social media dissemination','Newsletter dissemination','Press / media dissemination','Video dissemination','Community / stakeholder dissemination','Printed dissemination'] },
    website:    { label:'Website',               icon:'language',        color:'#1D4ED8', bg:'rgba(29,78,216,.08)', mobility:false, descHint:'Tell us about the website or platform you want to build. What is its purpose? What will users find there? In which languages?',
      subtypes: ['Project website','Landing page','Resource website','Learning platform','Community platform','Results repository'] },
    artistic:   { label:'Artistic Fees',         icon:'palette',         color:'#BE185D', bg:'rgba(190,24,93,.08)', mobility:false, descHint:'What kind of artistic or creative work do you need? What is it for (video, design, performance...)? How does it connect to the project goals?',
      subtypes: ['Graphic design','Video production / editing','Photography','Illustration / branding','Audio / podcast production','Artistic facilitation / performance'] },
    equipment:  { label:'Equipment',             icon:'devices',         color:'#0369A1', bg:'rgba(3,105,161,.08)', mobility:false, depreciation:true, descHint:'What equipment do you need to purchase? Why is it essential for the project? Which activities will use it?',
      subtypes: ['Computers / laptops','Tablets / mobile devices','Audio-visual equipment','Recording equipment','Educational / workshop equipment','Event technical equipment'] },
    goods:      { label:'Other Goods',           icon:'inventory_2',     color:'#7C3AED', bg:'rgba(124,58,237,.08)',mobility:false, depreciation:true, descHint:'What goods or services do you need? Why are they necessary for the project and which activities do they support?',
      subtypes: ['Printed materials','Educational materials','Visibility materials','Workshop materials','Event materials','Participant kits / welcome packs'] },
    consumables:{ label:'Consumables',           icon:'science',         color:'#0F766E', bg:'rgba(15,118,110,.08)',mobility:false, depreciation:true, descHint:'What materials or supplies do you need? What are they for and which project activities require them?',
      subtypes: ['Printing consumables','Workshop consumables','Office consumables','Hygiene / cleaning consumables','Catering consumables','Technical consumables'] },
    other:      { label:'Other Costs',           icon:'add_circle',      color:'#6B7280', bg:'rgba(107,114,128,.08)',mobility:false, depreciation:true, descHint:'Tell us about this cost. What does it cover, why is it needed and how did you estimate the amount?',
      subtypes: ['Translation / interpretation costs','External expert / trainer costs','Venue / space rental costs','Hosting / software / platform costs','Travel / accommodation support costs','Evaluation / administrative support costs'] },
  };

  const WP_TAXONOMY = [
    { cat:'Management & Coordination', titles:['Project Management and Coordination','Consortium Management and Coordination','Administrative and Financial Management'] },
    { cat:'Research & Methodology', titles:['Research, Analysis and Methodology','Needs Analysis and Research','Methodological Framework Development'] },
    { cat:'Content & Tools', titles:['Content Development and Tools','Resource Development and Pilot Delivery','Digital Tools and Learning Resources'] },
    { cat:'Training & Capacity', titles:['Training and Capacity Building','Training Delivery and Skills Development','Learning Programme Implementation'] },
    { cat:'Implementation & Pilot', titles:['Implementation and Pilot Activities','Pilot Activities and Validation','Testing and Pilot Delivery'] },
    { cat:'Quality & Monitoring', titles:['Quality Assurance and Monitoring','Monitoring and Internal Evaluation','Quality Management and Risk Monitoring'] },
    { cat:'Dissemination & Visibility', titles:['Communication, Dissemination and Visibility','Dissemination and Outreach Activities','Awareness Raising and Dissemination'] },
    { cat:'Impact & Sustainability', titles:['Impact, Exploitation and Sustainability','Evaluation, Dissemination and Sustainability','Long-term Impact and Sustainability'] },
  ];

  /* ── Helpers ────────────────────────────────────────────────── */
  const euros = n => '€' + Math.round(n).toLocaleString('es-ES');
  const pct   = (n, t) => t > 0 ? (n / t * 100).toFixed(1) + '%' : '0%';
  const $ = id => document.getElementById(id);
  const debounce = (fn, ms = 1500) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  function getGroupForCountry(country) {
    if (!country) return null;
    const c = country.toLowerCase().trim();
    return ERASMUS_REF_RATES.find(g => g.countries.some(x => c.includes(x) || x.includes(c.split(/[ ,]/)[0]))) || null;
  }
  function getOfficialRate(country) {
    const g = getGroupForCountry(country);
    return g || { manager:164, trainer:137, tech:102, admin:78 };
  }
  function getPerdiemRef(country) {
    const g = getGroupForCountry(country);
    return (g && PERDIEM_DEFAULTS[g.label]) ? { ...PERDIEM_DEFAULTS[g.label] } : { aloj:105, mant:40 };
  }
  function getPartnerPerdiem(pid) { return state.partnerRates[pid] || { aloj:105, mant:40 }; }
  function getPartnerPerdiemTotal(pid) { const r = getPartnerPerdiem(pid); return (r.aloj||0) + (r.mant||0); }
  function getBand(km) { return DISTANCE_BANDS.find(b => km >= b.min && km <= b.max) || DISTANCE_BANDS[0]; }
  function routeKey(a, b) { return a < b ? a + '_' + b : b + '_' + a; }
  function getRoute(a, b) { return state.routes[routeKey(a,b)] || { km:0, green:false, custom_rate:null }; }
  function getRouteCost(a, b) {
    const r = getRoute(a, b);
    return (r.custom_rate !== null && r.custom_rate !== undefined && r.custom_rate !== '') ? parseFloat(r.custom_rate)||0 : (r.green ? getBand(r.km).green : getBand(r.km).std);
  }
  function getWorkerRateDefault() {
    if (state.workerRates.length > 0) return Math.round(state.workerRates.reduce((s,w)=>s+w.rate,0)/state.workerRates.length);
    return 140;
  }
  function getPartnerDayRate(pid, profileId) {
    const rates = state.workerRates.filter(w => w.pid === pid);
    if (profileId) { const r = rates.find(w => w.id === profileId); if (r) return r.rate; }
    if (rates.length > 0) return Math.round(rates.reduce((s,w)=>s+w.rate,0)/rates.length);
    return getWorkerRateDefault();
  }
  function getFinancials() {
    const p = state.project;
    if (!p) return { euGrant:500000, cofinPct:80, totalProject:625000, ownFunds:125000, indirectPct:7 };
    const euGrant = p.eu_grant || 500000;
    const cofinPct = p.cofin_pct || 80;
    const indirectPct = p.indirect_pct || 7;
    const totalProject = euGrant / (cofinPct / 100);
    const ownFunds = totalProject - euGrant;
    return { euGrant, cofinPct, totalProject, ownFunds, indirectPct };
  }
  function applyIndirectCosts(direct) {
    const { indirectPct } = getFinancials();
    const indirect = direct * (indirectPct / 100);
    return { directCosts: direct, indirect, total: direct + indirect };
  }
  function wpLabel(wp, idx) { return `WP${idx+1} · ${wp.desc || wp.name || 'Sin título'}`; }

  function getProjectStart() {
    return state.project?.start_date ? new Date(state.project.start_date) : null;
  }
  function getProjectMonths() { return state.project?.duration_months || 24; }
  function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth()+n); return r; }
  function toISO(d) { return d ? d.toISOString().split('T')[0] : ''; }
  function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
  }
  function calcDepreciation(np) { return (np.amount||0) * ((np.project_pct||100)/100) * ((np.lifetime_pct||100)/100); }

  /* ── Save indicator ─────────────────────────────────────────── */
  function showSave(status) {
    const el = $('calc-save-indicator');
    if (!el) return;
    el.className = 'calc-save ' + status;
    el.textContent = status === 'saving' ? 'Guardando...' : status === 'saved' ? 'Guardado' : 'Error al guardar';
    if (status === 'saved') setTimeout(() => el.classList.add('hidden'), 2000);
  }

  /* ══════════════════════════════════════════════════════════════
     INIT & PROJECT SELECTOR
     ══════════════════════════════════════════════════════════════ */

  function init() {
    if (currentProjectId && currentStep >= 0) {
      // Already loaded, just re-render current step
      return;
    }
    renderProjectSelector();
  }

  async function renderProjectSelector() {
    currentStep = -1;
    const root = $('calc-root');
    root.innerHTML = `
      <div class="mb-6">
        <h1 class="font-headline text-2xl font-bold text-on-surface tracking-tight">Budget Calculator</h1>
        <p class="text-on-surface-variant text-sm mt-1">Select a project to start building its budget.</p>
      </div>
      <div id="calc-projects-list" class="space-y-3">
        <div class="text-center py-12 text-on-surface-variant"><span class="spinner"></span></div>
      </div>`;

    try {
      const projects = await API.get('/intake/projects') || [];
      const list = $('calc-projects-list');

      if (!projects.length) {
        list.innerHTML = `
          <div class="text-center py-16">
            <span class="material-symbols-outlined text-5xl text-outline-variant mb-3">folder_off</span>
            <p class="text-on-surface-variant mb-4">No projects yet. Create one in Intake first.</p>
            <button onclick="App.navigate('intake',true,true)" class="px-5 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-container transition-colors">
              <span class="material-symbols-outlined text-[16px] align-middle mr-1">add_circle</span>
              New Project
            </button>
          </div>`;
        return;
      }

      list.innerHTML = projects.map(p => {
        const typeLabel = p.type || 'No type';
        const partnerCount = p.partner_count || '?';
        return `
        <div class="flex items-center gap-4 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group"
             onclick="Calculator._loadProject('${p.id}')">
          <div class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-content-center shrink-0">
            <span class="material-symbols-outlined text-primary text-xl m-auto">calculate</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-headline font-bold text-on-surface truncate group-hover:text-primary transition-colors">${p.name || 'Untitled'}</div>
            <div class="text-xs text-on-surface-variant mt-0.5 flex items-center gap-3 flex-wrap">
              <span>${typeLabel}</span>
              <span>·</span>
              <span>${p.duration_months || '?'} months</span>
              <span>·</span>
              <span>${euros(p.eu_grant || 0)}</span>
            </div>
          </div>
          <span class="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">arrow_forward</span>
        </div>`;
      }).join('');
    } catch (e) {
      $('calc-projects-list').innerHTML = `<div class="text-center py-8 text-error">${e.message || 'Error loading projects'}</div>`;
    }
  }

  async function loadProject(projectId) {
    console.log('[Calc] loadProject called with:', projectId);
    currentProjectId = projectId;
    const root = $('calc-root');
    root.innerHTML = `<div class="text-center py-16"><span class="spinner"></span><p class="text-on-surface-variant text-sm mt-3">Loading project...</p></div>`;

    try {
      const [projRes, partnersRes] = await Promise.all([
        API.get(`/intake/projects/${projectId}`),
        API.get(`/intake/projects/${projectId}/partners`),
      ]);
      console.log('[Calc] projRes:', projRes);
      console.log('[Calc] partnersRes:', partnersRes);
      state.project = projRes;
      state.partners = (partnersRes || []).sort((a,b) => a.order_index - b.order_index);

      // Init rates from partner countries
      state.partnerRates = {};
      state.workerRates = [];
      state.wrCounter = 0;
      state.partners.forEach(p => {
        state.partnerRates[p.id] = getPerdiemRef(p.country);
        const ref = getOfficialRate(p.country);
        PROFILES.forEach(prof => {
          state.workerRates.push({ id: ++state.wrCounter, pid: p.id, category: prof.label, rate: ref[prof.field] || 140 });
        });
      });

      // Init routes — default to 500-1999km band with eco travel
      state.routes = {};
      const defaultBand = DISTANCE_BANDS[3]; // 500-1999 km
      const defaultKm = Math.round((defaultBand.min + defaultBand.max) / 2);
      for (let i = 0; i < state.partners.length; i++)
        for (let j = i+1; j < state.partners.length; j++)
          state.routes[routeKey(state.partners[i].id, state.partners[j].id)] = { km: defaultKm, green: true, custom_rate: defaultBand.green };

      // Init WPs
      state.wps = [];
      state.actCounter = 0;
      syncWPCount(4);

      maxReached = 0;
      renderShell();
      goToStep(0);
    } catch (e) {
      console.error('[Calc] loadProject error:', e);
      root.innerHTML = `<div class="text-center py-12 text-error">Error: ${e.message || JSON.stringify(e)}</div>`;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     SHELL & NAVIGATION
     ══════════════════════════════════════════════════════════════ */

  const STEP_LABELS = ['Rates','Routes','Work Packages','Activities','Budget','Gantt'];

  function renderShell() {
    const p = state.project;
    const root = $('calc-root');
    root.innerHTML = `
      <div class="flex items-center gap-3 mb-1">
        <button onclick="Calculator._backToSelector()" class="text-on-surface-variant hover:text-primary transition-colors" title="Back to projects">
          <span class="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div class="flex-1 min-w-0">
          <h1 class="font-headline text-xl font-bold text-on-surface tracking-tight truncate">${p.name || 'Project'}</h1>
          <p class="text-xs text-on-surface-variant">${p.type || ''} · ${state.partners.length} partners · ${p.duration_months || 24} months · ${euros(p.eu_grant || 0)}</p>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="flex items-center gap-1 my-5 px-2" id="calc-progress">
        ${STEP_LABELS.map((label, i) => `
          <button class="flex flex-col items-center gap-1 group" onclick="Calculator._goTo(${i})" id="calc-prog-${i}">
            <div class="calc-prog-dot ${i === 0 ? 'active' : 'locked'}">${i+1}</div>
            <span class="calc-prog-label text-[10px] font-semibold text-on-surface-variant group-hover:text-primary transition-colors">${label}</span>
          </button>
          ${i < STEP_LABELS.length - 1 ? '<div class="calc-prog-line"></div>' : ''}
        `).join('')}
      </div>

      <!-- Step container -->
      <div id="calc-step-container"></div>

      <!-- Save indicator -->
      <div id="calc-save-indicator" class="calc-save hidden"></div>
    `;
  }

  function goToStep(n) {
    if (n > maxReached + 1) return;
    if (n > maxReached) maxReached = n;
    currentStep = n;

    // Update progress dots
    STEP_LABELS.forEach((_, i) => {
      const dot = document.querySelector(`#calc-prog-${i} .calc-prog-dot`);
      if (!dot) return;
      dot.classList.remove('active','done','locked');
      if (i === n) dot.classList.add('active');
      else if (i < n) dot.classList.add('done');
      else if (i <= maxReached) { /* clickable but not styled */ }
      else dot.classList.add('locked');
    });
    document.querySelectorAll('.calc-prog-line').forEach((line, i) => {
      line.classList.toggle('done', i < n);
    });

    // Render step content
    const container = $('calc-step-container');
    switch(n) {
      case 0: renderRates(container); break;
      case 1: renderRoutes(container); break;
      case 2: renderWorkPackages(container); break;
      case 3: renderActivities(container); break;
      case 4: renderResults(container); break;
      case 5: renderGantt(container); break;
    }
    window.scrollTo(0, 0);
  }

  function navButtons(prev, next, nextLabel) {
    return `<div class="flex justify-between mt-6">
      ${prev !== null ? `<button onclick="Calculator._goTo(${prev})" class="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface border border-outline-variant rounded-lg transition-colors">← Back</button>` : '<span></span>'}
      ${next !== null ? `<button onclick="Calculator._goTo(${next})" class="px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-container transition-colors">${nextLabel || 'Next →'}</button>` : ''}
    </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 0: RATES
     ══════════════════════════════════════════════════════════════ */

  function renderRates(container) {
    container.innerHTML = `
      <h2 class="font-headline text-lg font-bold mb-1">Per diem & Worker Rates</h2>
      <p class="text-sm text-on-surface-variant mb-5">Accommodation, subsistence and staff costs per partner. Auto-filled from Erasmus+ reference rates — editable.</p>

      <!-- Per diem -->
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-5 mb-4">
        <h3 class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px]">hotel</span> Per Diem Rates
        </h3>
        <div class="overflow-x-auto">
          <table class="calc-table">
            <thead><tr>
              <th class="text-left">Partner</th>
              <th class="text-left">Group</th>
              <th class="text-right">Accommodation €/day</th>
              <th class="text-right">Subsistence €/day</th>
              <th class="text-right">Total/day</th>
            </tr></thead>
            <tbody>
              ${state.partners.map((p, i) => {
                const r = state.partnerRates[p.id] || getPerdiemRef(p.country);
                const g = getGroupForCountry(p.country);
                const total = (r.aloj||0) + (r.mant||0);
                const c = WP_COLORS[i % WP_COLORS.length];
                return `<tr>
                  <td>
                    <div class="flex items-center gap-2">
                      <span class="w-6 h-6 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0" style="background:${c}">${i+1}</span>
                      <div>
                        <div class="font-semibold text-sm">${p.name || 'Partner '+(i+1)}</div>
                        <div class="text-[11px] text-on-surface-variant">${p.country || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="text-[11px] bg-surface-container-high px-2 py-0.5 rounded-full">${g ? g.label : '—'}</span></td>
                  <td class="text-right"><input type="number" value="${r.aloj}" min="0" onchange="Calculator._setPerdiem('${p.id}','aloj',this.value)"></td>
                  <td class="text-right"><input type="number" value="${r.mant}" min="0" onchange="Calculator._setPerdiem('${p.id}','mant',this.value)"></td>
                  <td class="text-right font-bold" style="color:${c}" id="calc-pd-total-${p.id}">${euros(total)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Worker rates -->
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-5 mb-4">
        <h3 class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 flex items-center gap-2">
          <span class="material-symbols-outlined text-[16px]">badge</span> Worker Rates (€/day)
        </h3>
        <div id="calc-worker-rates">${buildWorkerRatesHTML()}</div>
      </div>

      ${_embeddedMode ? embeddedNavButtons(1, 3, 'Rutas \u2192') : navButtons(null, 1, 'Routes \u2192')}
    `;
  }

  function buildWorkerRatesHTML() {
    return state.partners.map((p, pi) => {
      const rates = state.workerRates.filter(w => w.pid === p.id);
      const g = getGroupForCountry(p.country);
      const c = WP_COLORS[pi % WP_COLORS.length];
      return `
      <div class="border border-outline-variant/20 rounded-lg mb-3 overflow-hidden">
        <div class="flex items-center gap-2 px-3 py-2 border-b border-outline-variant/10" style="background:${WP_BG[pi % WP_BG.length]}">
          <span class="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style="background:${c}">${pi+1}</span>
          <span class="font-semibold text-sm" style="color:${c}">${p.name || 'Partner '+(pi+1)}</span>
          <span class="text-xs text-on-surface-variant ml-1">${g ? g.label : '—'}</span>
        </div>
        <table class="calc-table">
          <tbody>
            ${rates.map(w => `<tr>
              <td class="w-5/12"><input type="text" value="${w.category}" class="w-full px-2 py-1 text-sm border border-outline-variant/30 rounded" onchange="Calculator._setWorkerRate(${w.id},'category',this.value)"></td>
              <td class="text-right"><input type="number" value="${w.rate}" min="0" onchange="Calculator._setWorkerRate(${w.id},'rate',this.value)"><span class="text-[11px] text-on-surface-variant ml-1">\u20AC/day</span></td>
              <td class="text-right"><span class="text-sm font-bold text-primary/70">\u20AC${(w.rate * 22).toLocaleString('en')}</span><span class="text-[10px] text-on-surface-variant/50 ml-1">/PM</span></td>
              <td class="w-8 text-center"><button onclick="Calculator._removeWorkerRate(${w.id})" class="text-error hover:text-error-container text-lg leading-none">&times;</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="px-3 py-2 bg-surface-container">
          <button onclick="Calculator._addWorkerRate('${p.id}')" class="text-xs font-semibold text-primary hover:underline">+ Add profile</button>
        </div>
      </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 1: ROUTES
     ══════════════════════════════════════════════════════════════ */

  function routeLabel(p) {
    const acronym = (p.name || '').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 5);
    const loc = [p.city, p.country].filter(Boolean).join(', ');
    return `<span class="font-mono font-bold text-xs text-primary">${acronym}</span> <span class="text-xs text-on-surface-variant">${loc}</span>`;
  }

  function routeRowHTML(aId, aLabel, bId, bLabel) {
    const k = routeKey(aId, bId);
    const r = getRoute(aId, bId);
    const bandIdx = DISTANCE_BANDS.findIndex(bd => r.km >= bd.min && r.km <= bd.max);
    const selIdx = bandIdx >= 0 ? bandIdx : 0;
    const band = DISTANCE_BANDS[selIdx];
    const official = r.green ? band.green : band.std;
    const custom = (r.custom_rate !== null && r.custom_rate !== undefined) ? r.custom_rate : '';
    return `<tr>
      <td>${aLabel} <span class="text-on-surface-variant mx-1">↔</span> ${bLabel}</td>
      <td class="text-center">
        <label class="flex items-center justify-center gap-1 cursor-pointer">
          <input type="checkbox" ${r.green?'checked':''} class="w-3.5 h-3.5" onchange="Calculator._setRoute('${aId}','${bId}','green',this.checked)">
          <span class="text-[10px] text-[#065F46] font-semibold">Eco</span>
        </label>
      </td>
      <td>
        <select class="text-xs px-2 py-1 border border-outline-variant/30 rounded" onchange="Calculator._setRouteBand('${aId}','${bId}',parseInt(this.value))">
          ${DISTANCE_BANDS.map((bd,idx) => `<option value="${idx}" ${idx===selIdx?'selected':''}>${bd.label}</option>`).join('')}
        </select>
      </td>
      <td class="text-right text-sm text-on-surface-variant" id="calc-route-off-${k}">€${official}</td>
      <td class="text-right"><input type="number" value="${custom}" min="0" placeholder="—" class="w-24" onchange="Calculator._setRoute('${aId}','${bId}','custom_rate',this.value)" id="calc-route-custom-${k}"></td>
    </tr>`;
  }

  function renderRoutes(container) {
    // Auto-fix routes with km=0 to default band (500-1999km eco)
    const defBand = DISTANCE_BANDS[3];
    const defKm = Math.round((defBand.min + defBand.max) / 2);
    Object.keys(state.routes).forEach(k => {
      const r = state.routes[k];
      if (!r.km || r.km === 0) {
        r.km = defKm;
        r.green = true;
        r.custom_rate = defBand.green;
      }
    });

    const partners = state.partners;
    const pairs = [];
    for (let i = 0; i < partners.length; i++)
      for (let j = i+1; j < partners.length; j++)
        pairs.push([partners[i], partners[j]]);

    // Extra destination routes: each partner ↔ each extra dest
    const extraRows = [];
    for (const p of partners) {
      for (const d of state.extraDests) {
        const dLabel = `<span class="font-mono font-bold text-xs text-amber-700">${(d.name||'').split(/[\s(]/)[0].toUpperCase().slice(0,5)}</span> <span class="text-xs text-on-surface-variant">${[d.name, d.country].filter(Boolean).join(', ')}</span>`;
        extraRows.push(routeRowHTML(p.id, routeLabel(p), d.id, dLabel));
      }
    }

    container.innerHTML = `
      <h2 class="font-headline text-lg font-bold mb-1">Routes & Distances</h2>
      <p class="text-sm text-on-surface-variant mb-5">Set distance bands between partners. Use the <a href="https://erasmus-plus.ec.europa.eu/resources-and-tools/distance-calculator" target="_blank" class="text-primary font-semibold hover:underline">EC distance calculator ↗</a>.</p>

      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-5 mb-4">
        <div class="overflow-x-auto">
          <table class="calc-table">
            <thead><tr>
              <th class="text-left">Route</th>
              <th class="text-center">Eco</th>
              <th>Distance Band</th>
              <th class="text-right">Official</th>
              <th class="text-right">Actual €</th>
            </tr></thead>
            <tbody>
              ${pairs.map(([a, b]) => routeRowHTML(a.id, routeLabel(a), b.id, routeLabel(b))).join('')}
              ${extraRows.length ? `<tr><td colspan="5" class="pt-4 pb-2"><span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Otros destinos</span></td></tr>` + extraRows.join('') : ''}
            </tbody>
          </table>
        </div>
        <p class="text-[11px] text-on-surface-variant mt-3">The <strong>Actual €</strong> amount is used in calculations. If left blank, the official rate applies.</p>
      </div>

      <!-- Extra destinations -->
      ${state.extraDests.length === 0 ? (state.extraDestCounter++, state.extraDests.push({ id: '_ed' + state.extraDestCounter, name: '', country: '' }), '') : ''}
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-5 mb-4">
        <h3 class="font-headline text-sm font-bold mb-3">Otros destinos</h3>
        <p class="text-xs text-on-surface-variant mb-3">Añade ciudades o sedes que no son socios pero donde se realizarán actividades (ej. Bruselas, sede de la agencia, etc.).</p>
        <div id="calc-extra-dests">
          ${state.extraDests.map((d, i) => `
            <div class="flex items-center gap-2 mb-2">
              <input type="text" value="${d.name}" placeholder="City (e.g. Brussels)" class="flex-1 px-3 py-2 rounded-lg border border-outline-variant text-sm" onchange="Calculator._setExtraDest(${i},'name',this.value)">
              <input type="text" value="${d.country || ''}" placeholder="Country (e.g. Belgium)" class="w-36 px-3 py-2 rounded-lg border border-outline-variant text-sm" onchange="Calculator._setExtraDest(${i},'country',this.value)">
              <button onclick="Calculator._removeExtraDest(${i})" class="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors">
                <span class="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          `).join('')}
        </div>
        <button onclick="Calculator._addExtraDest()" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5 transition-colors mt-1">
          <span class="material-symbols-outlined text-sm">add</span> Añadir destino
        </button>
      </div>

      ${_embeddedMode ? embeddedNavButtons(2, 4, 'Work Packages \u2192') : navButtons(0, 2, 'Work Packages \u2192')}
    `;
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 2: WORK PACKAGES
     ══════════════════════════════════════════════════════════════ */

  function syncWPCount(n) {
    while (state.wps.length < n) {
      const wi = state.wps.length;
      const defaultLeader = state.partners[wi]?.id || state.partners[0]?.id || null;
      let name = `WP${wi+1}`;
      if (wi === 0) name = 'Project Management and Coordination';
      else if (wi === n-1 && n > 1) name = 'Impact, Exploitation and Sustainability';
      state.wps.push({ name, desc: '', leader: defaultLeader, activities: [] });
    }
    state.wps = state.wps.slice(0, n);
  }

  function renderWorkPackages(container) {
    container.innerHTML = `
      <h2 class="font-headline text-lg font-bold mb-1">Work Packages</h2>
      <p class="text-sm text-on-surface-variant mb-5">Define WP structure, titles and leaders.</p>

      <div class="flex items-center gap-3 mb-4">
        <label class="text-sm font-semibold text-on-surface-variant">Number of WPs</label>
        <input type="number" id="calc-n-wps" value="${state.wps.length}" min="1" max="12" class="w-20 px-2 py-1.5 text-sm border border-outline-variant/30 rounded-lg text-center font-bold" onchange="Calculator._syncWPs(parseInt(this.value))">
      </div>

      <div id="calc-wp-list" class="space-y-3">${buildWPListHTML()}</div>

      ${navButtons(1, 3, 'Activities →')}
    `;
  }

  function buildWPListHTML() {
    return state.wps.map((wp, wi) => {
      const c = WP_COLORS[wi % WP_COLORS.length];
      const leaderOpts = state.partners.map(p => `<option value="${p.id}" ${p.id===wp.leader?'selected':''}>${p.name||'Partner '+p.order_index}</option>`).join('');
      const catOpts = (wi === 0
        ? '<option selected>Management & Coordination</option>'
        : '<option value="">— Category —</option>' + WP_TAXONOMY.map(g => `<option value="${g.cat}" ${g.cat===wp._cat?'selected':''}>${g.cat}</option>`).join(''));
      const titleOpts = wp._cat
        ? (WP_TAXONOMY.find(g=>g.cat===wp._cat)?.titles||[]).map(t => `<option value="${t}" ${t===wp.desc?'selected':''}>${t}</option>`).join('')
        : '';

      return `
      <div class="border border-outline-variant/20 rounded-xl overflow-hidden">
        <div class="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/10" style="background:${WP_BG[wi%WP_BG.length]}">
          <span class="w-8 h-8 rounded-full text-white text-xs font-extrabold flex items-center justify-center shrink-0" style="background:${c}">WP${wi+1}</span>
          <input type="text" value="${wp.name}" placeholder="WP name..." class="flex-1 bg-transparent border-none font-headline font-bold text-sm focus:outline-none" style="color:${c}" onchange="Calculator._setWP(${wi},'name',this.value)">
          <div class="flex items-center gap-1 shrink-0">
            <span class="text-[11px] text-on-surface-variant">Leader:</span>
            <select class="text-xs px-1.5 py-1 border border-outline-variant/20 rounded font-medium" style="color:${c}" onchange="Calculator._setWP(${wi},'leader',this.value)">${leaderOpts}</select>
          </div>
        </div>
        <div class="p-4 bg-surface-container-lowest space-y-2">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[11px] font-semibold text-on-surface-variant uppercase">Category</label>
              <select class="text-xs w-full px-2 py-1.5 border border-outline-variant/30 rounded" ${wi===0?'disabled':''} onchange="Calculator._setWPCat(${wi},this.value)">${catOpts}</select>
            </div>
            <div>
              <label class="text-[11px] font-semibold text-on-surface-variant uppercase">Suggested title</label>
              <select class="text-xs w-full px-2 py-1.5 border border-outline-variant/30 rounded" ${!titleOpts?'disabled':''} onchange="Calculator._applyWPTitle(${wi},this.value)">
                <option value="">${wp._cat ? '— Pick title —' : '← Pick category'}</option>
                ${titleOpts}
              </select>
            </div>
          </div>
          <div>
            <label class="text-[11px] font-semibold text-on-surface-variant uppercase">Full title</label>
            <input type="text" value="${wp.desc||''}" placeholder="e.g. Development of digital tools..." class="w-full text-sm px-2 py-1.5 border border-outline-variant/30 rounded" onchange="Calculator._setWP(${wi},'desc',this.value)">
          </div>
        </div>
      </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 3: ACTIVITIES
     ══════════════════════════════════════════════════════════════ */

  function renderActivities(container) {
    // Ensure WP1 has mgmt
    if (state.wps[0] && state.wps[0].activities.length === 0) {
      state.wps[0].activities.push({
        id: ++state.actCounter, type:'mgmt', label:'Project Management',
        rate_applicant:500, rate_partner:250,
        date_start: toISO(getProjectStart()), date_end: toISO(addMonths(getProjectStart()||new Date(), getProjectMonths()))
      });
    }

    const directTotal = state.wps.reduce((s, wp) => s + wp.activities.reduce((ss, a) => ss + calcActivity(a).total, 0), 0);
    const { total } = applyIndirectCosts(directTotal);
    const { totalProject } = getFinancials();
    const usePct = totalProject > 0 ? Math.min(total / totalProject * 100, 100).toFixed(1) : 0;

    container.innerHTML = `
      <h2 class="font-headline text-lg font-bold mb-1">Activities</h2>
      <p class="text-sm text-on-surface-variant mb-4">Add and configure activities for each Work Package.</p>

      <!-- Summary bar -->
      <div class="bg-primary text-white rounded-xl p-4 mb-5 flex items-center gap-5 flex-wrap">
        <div class="flex-1 min-w-[120px]">
          <div class="text-[10px] uppercase tracking-wider opacity-50 mb-1">Total calculated</div>
          <div class="font-headline text-2xl font-bold" id="calc-live-total">${euros(total)}</div>
        </div>
        <div class="min-w-[90px]">
          <div class="text-[10px] uppercase tracking-wider opacity-50 mb-1">Target</div>
          <div class="text-sm font-mono">${euros(totalProject)}</div>
        </div>
        <div class="min-w-[90px]">
          <div class="text-[10px] uppercase tracking-wider opacity-50 mb-1">Difference</div>
          <div class="text-sm font-mono" id="calc-live-diff">${euros(totalProject - total)}</div>
        </div>
        <div class="flex-[2] min-w-[150px]">
          <div class="text-[10px] opacity-40 mb-1">Budget usage</div>
          <div class="h-1.5 rounded bg-white/20 overflow-hidden">
            <div class="h-full rounded bg-white transition-all" id="calc-live-bar" style="width:${usePct}%"></div>
          </div>
        </div>
      </div>

      <div id="calc-wps-container">
        ${state.wps.map((wp, wi) => buildWPSection(wp, wi)).join('')}
      </div>

      ${navButtons(2, 4, 'Budget Summary →')}
    `;

    // Calculate all
    state.wps.forEach((_, wi) => recalcWP(wi));
  }

  function buildWPSection(wp, wi) {
    const c = WP_COLORS[wi % WP_COLORS.length];
    return `
    <div class="calc-wp open" id="calc-wp-${wi}">
      <div class="calc-wp-head" onclick="Calculator._toggleWP(${wi})">
        <span class="w-9 h-9 rounded-full text-white text-[11px] font-extrabold flex items-center justify-center shrink-0" style="background:${c}">WP${wi+1}</span>
        <div class="flex-1 min-w-0">
          <div class="font-headline text-sm font-bold text-on-surface truncate">${wp.desc || wp.name || 'Untitled'}</div>
        </div>
        <span class="text-sm font-mono text-on-surface-variant" id="calc-wp-total-${wi}">—</span>
        <span class="material-symbols-outlined calc-wp-chevron">expand_more</span>
      </div>
      <div class="calc-wp-body">
        <div id="calc-wp-acts-${wi}">
          ${wp.activities.map(a => buildActivityCard(a, wi)).join('')}
        </div>
        <div class="mt-3">
          <div class="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">Add activity</div>
          <div class="calc-act-picker">
            ${Object.entries(ACT_TYPES).filter(([k]) => (k !== 'mgmt' && k !== 'meeting') || wi === 0).map(([k, v]) => `
              <button class="calc-act-pick" onclick="Calculator._addActivity(${wi},'${k}')">
                <span class="material-symbols-outlined text-base mb-1" style="color:${v.color}">${v.icon}</span>
                <span class="block text-xs font-semibold text-on-surface">${v.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    </div>`;
  }

  function buildActivityCard(act, wi) {
    const def = ACT_TYPES[act.type];
    const subtypes = def.subtypes || [];
    const subtypeSelect = subtypes.length > 0 ? `
      <select class="text-xs px-2 py-1 rounded-lg border border-outline-variant/30 bg-white focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer" style="color:${def.color}" onchange="Calculator._setActSubtype(${wi},${act.id},this.value)">
        <option value="" ${!act.subtype ? 'selected' : ''}>Select type...</option>
        ${subtypes.map(s => `<option value="${s}" ${act.subtype === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>` : '';
    return `
    <div class="calc-act" id="calc-act-${act.id}">
      <div class="flex items-center gap-2 mb-2">
        <span class="calc-act-badge" style="background:${def.bg};color:${def.color}">
          <span class="material-symbols-outlined text-[12px] align-middle mr-0.5">${def.icon}</span> ${def.label}
        </span>
        ${subtypeSelect}
        <input type="text" value="${act.label}" placeholder="Name..." class="flex-1 bg-transparent border-b border-outline-variant/30 px-1 py-0.5 text-sm font-semibold font-headline focus:outline-none focus:border-primary" onchange="Calculator._setAct(${wi},${act.id},'label',this.value)">
        <button onclick="Calculator._removeAct(${wi},${act.id})" class="text-error/60 hover:text-error text-lg leading-none ml-2">&times;</button>
      </div>
      <div class="mb-2">
        <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1 block">Description</label>
        <textarea rows="3" placeholder="${act.subtype ? def.descHint : 'Select a type above or write your own description of this ' + def.label.toLowerCase() + '...'}" class="w-full px-3 py-2.5 text-sm bg-white border border-outline-variant/30 rounded-xl resize-vertical focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 leading-relaxed" onchange="Calculator._setActDesc(${wi},${act.id},this.value)">${act.desc || ''}</textarea>
      </div>
      <div id="calc-act-fields-${act.id}">${buildActFields(act, wi)}</div>
      <div class="mt-2 pt-2 border-t border-outline-variant/10" id="calc-act-result-${act.id}"></div>
    </div>`;
  }

  /* ── Activity field builders ────────────────────────────────── */

  function buildActFields(act, wi) {
    const n = state.partners.length;
    const mo = getProjectMonths();

    if (ACT_TYPES[act.type]?.mobility) return buildMobilityFields(act, wi);
    if (act.type === 'me') return buildMEFields(act, wi);

    switch (act.type) {
      case 'mgmt':
        return `<div class="grid grid-cols-3 gap-2">
          <div><label class="text-[11px] text-on-surface-variant">€/month applicant</label><input type="number" value="${act.rate_applicant||500}" min="0" class="w-full" onchange="Calculator._setAct(${wi},${act.id},'rate_applicant',this.value)"></div>
          <div><label class="text-[11px] text-on-surface-variant">€/month partners</label><input type="number" value="${act.rate_partner||250}" min="0" class="w-full" onchange="Calculator._setAct(${wi},${act.id},'rate_partner',this.value)"></div>
          <div class="text-[11px] text-on-surface-variant self-end pb-2">Duration: <strong>${mo} months</strong></div>
        </div>`;

      case 'io':
        return buildIOFields(act, wi);

      case 'local_ws':
        return buildPerPartnerFields(act, wi, 'ws_partners',
          { ws_pax:10, ws_n:6, ws_cost:50 },
          (pid, d) => `
            <td class="text-center"><label class="text-[10px] text-on-surface-variant block">Pax/session</label><input type="number" value="${d.ws_pax}" min="0" class="w-16" ${!d.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'ws_partners','${pid}','ws_pax',this.value)"></td>
            <td class="text-center"><label class="text-[10px] text-on-surface-variant block">Sessions</label><input type="number" value="${d.ws_n}" min="0" class="w-16" ${!d.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'ws_partners','${pid}','ws_n',this.value)"></td>
            <td class="text-center"><label class="text-[10px] text-on-surface-variant block">€/pax/day</label><input type="number" value="${d.ws_cost}" min="0" class="w-16" ${!d.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'ws_partners','${pid}','ws_cost',this.value)"></td>`,
          d => (d.ws_pax||0) * (d.ws_n||0) * (d.ws_cost||0),
          ['Pax/session','Sessions','€/pax/day']
        );

      case 'campaign':
        return buildPerPartnerFields(act, wi, 'camp_partners',
          { monthly:100, months: mo },
          (pid, d) => `
            <td class="text-center"><label class="text-[10px] text-on-surface-variant block">€/month</label><input type="number" value="${d.monthly}" min="0" class="w-20" ${!d.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'camp_partners','${pid}','monthly',this.value)"></td>
            <td class="text-center"><label class="text-[10px] text-on-surface-variant block">Months</label><input type="number" value="${d.months}" min="0" max="${mo}" class="w-16" ${!d.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'camp_partners','${pid}','months',this.value)"></td>`,
          d => (d.monthly||0) * (d.months||0),
          ['€/month','Months']
        );

      case 'equipment': case 'goods': case 'consumables': case 'other':
        return buildDepreciationFields(act, wi);

      case 'website': case 'artistic':
        return buildNoteAmountFields(act, wi);

      default: return '';
    }
  }

  /* ── Mobility fields ────────────────────────────────────────── */

  function buildMobilityFields(act, wi) {
    if (!act.host) act.host = state.partners[0]?.id;
    if (act.pax === undefined) act.pax = 2;
    if (act.days === undefined) act.days = 3;
    if (act.local_pax === undefined) act.local_pax = 0;
    if (act.local_transport === undefined) act.local_transport = 25;
    if (!act.participants) { act.participants = {}; state.partners.forEach(p => { if (p.id !== act.host) act.participants[p.id] = true; }); }

    const hostPartner = state.partners.find(p => p.id === act.host) || state.extraDests.find(d => d.id === act.host);
    const hostName = hostPartner?.name || 'Host';
    const hostLoc = hostPartner ? [hostPartner.city, hostPartner.country].filter(Boolean).join(', ') : '';

    const hostOpts = state.partners.map(p => `<option value="${p.id}" ${p.id===act.host?'selected':''}>${p.name||'P'+p.order_index}</option>`).join('')
      + (state.extraDests.length ? '<option disabled>\u2500\u2500\u2500</option>' + state.extraDests.filter(d => d.name).map(d => `<option value="${d.id}" ${d.id===act.host?'selected':''}>${d.name}</option>`).join('') : '');

    const pax = act.pax || 2;
    const days = act.days || 3;

    // Ensure all partners have participation state
    if (!act.participants) { act.participants = {}; state.partners.forEach(p => { act.participants[p.id] = true; }); }

    // All partners — same rules, host just has travel=0 to itself
    const rows = state.partners.map((p, i) => {
      const isHost = p.id === act.host;
      const active = act.participants[p.id] !== false;
      const rate = isHost ? 0 : getRouteCost(p.id, act.host);
      const travelCost = active ? rate * pax : 0;
      const perdiem = getPartnerPerdiemTotal(p.id);
      const accomCost = active ? perdiem * pax * days : 0;
      const rowTotal = travelCost + accomCost;

      return `<tr style="opacity:${active?1:.4}">
        <td><label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${active?'checked':''} class="w-3.5 h-3.5" onchange="Calculator._setParticipant(${wi},${act.id},'${p.id}',this.checked)">
          <div>
            <div class="font-medium text-sm">${p.name||'P'+p.order_index} ${isHost ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary ml-1">HOST</span>' : ''}</div>
            <div class="text-[10px] text-on-surface-variant">${[p.city,p.country].filter(Boolean).join(', ')}</div>
          </div>
        </label></td>
        <td class="text-right font-mono text-xs">${active && !isHost ? `${pax}p \u00D7 \u20AC${rate}` : '\u2014'}</td>
        <td class="text-right font-mono text-xs">${active && !isHost ? euros(travelCost) : '\u2014'}</td>
        <td class="text-right font-mono text-xs">${active ? `${pax}p \u00D7 ${days}d \u00D7 \u20AC${perdiem}` : '\u2014'}</td>
        <td class="text-right font-mono text-xs">${active ? euros(accomCost) : '\u2014'}</td>
        <td class="text-right font-mono text-sm font-bold">${active ? euros(rowTotal) : '\u2014'}</td>
      </tr>`;
    }).join('');

    return `
      <div class="grid grid-cols-3 gap-2 mb-3">
        <div><label class="text-[11px] text-on-surface-variant">Host</label><select class="w-full text-sm" onchange="Calculator._setActHost(${wi},${act.id},this.value)">${hostOpts}</select></div>
        <div><label class="text-[11px] text-on-surface-variant">Travellers/partner</label><input type="number" value="${act.pax}" min="0" class="w-full" onchange="Calculator._setAct(${wi},${act.id},'pax',this.value)"></div>
        <div><label class="text-[11px] text-on-surface-variant">Days</label><input type="number" value="${act.days}" min="0" class="w-full" onchange="Calculator._setAct(${wi},${act.id},'days',this.value)"></div>
      </div>
      <div class="grid grid-cols-2 gap-2 mb-3 p-2 rounded bg-surface-container-low border border-outline-variant/10">
        <div><label class="text-[11px] text-on-surface-variant">Local participants</label><input type="number" value="${act.local_pax||0}" min="0" class="w-full" onchange="Calculator._setAct(${wi},${act.id},'local_pax',this.value)"></div>
        <div><label class="text-[11px] text-on-surface-variant">Local transport \u20AC/pax</label><input type="number" value="${act.local_transport||25}" min="0" class="w-full" onchange="Calculator._setAct(${wi},${act.id},'local_transport',this.value)"></div>
      </div>
      ${state.partners.length ? `<div class="overflow-x-auto"><table class="calc-table"><thead><tr>
        <th class="text-left">Partner</th>
        <th class="text-right">Travel rate</th>
        <th class="text-right">Travel cost</th>
        <th class="text-right">Accom. rate</th>
        <th class="text-right">Accom. cost</th>
        <th class="text-right">Total</th>
      </tr></thead><tbody>${rows}</tbody></table></div>` : ''}
    `;
  }

  /* ── IO fields ──────────────────────────────────────────────── */

  function buildIOFields(act, wi) {
    if (!act.io_staff) {
      act.io_staff = {};
      state.partners.forEach(p => {
        const rates = state.workerRates.filter(w => w.pid === p.id);
        act.io_staff[p.id] = {
          active: true,
          staff: [{ profileId: rates[0]?.id || null, days: 20, tasks: '' }]
        };
      });
    }

    let totalCost = 0;
    state.partners.forEach(p => {
      const ps = act.io_staff[p.id];
      if (!ps || !ps.active) return;
      ps.staff.forEach(s => { totalCost += (s.days || 0) * getPartnerDayRate(p.id, s.profileId); });
    });

    const blocks = state.partners.map((p, i) => {
      const ps = act.io_staff[p.id] || { active: false, staff: [] };
      const rates = state.workerRates.filter(w => w.pid === p.id);
      const color = WP_COLORS[i % WP_COLORS.length];
      const bg = WP_BG[i % WP_BG.length];
      let pTotal = 0;
      if (ps.active) ps.staff.forEach(s => { pTotal += (s.days || 0) * getPartnerDayRate(p.id, s.profileId); });

      const staffRows = ps.staff.map((s, si) => {
        const rate = getPartnerDayRate(p.id, s.profileId);
        const profOpts = `<option value="">Select profile...</option>` + rates.map(w =>
          `<option value="${w.id}" ${String(w.id)===String(s.profileId)?'selected':''}>${w.category} \u2014 \u20AC${w.rate}/day</option>`).join('');
        return `<div class="flex gap-2 items-start mb-2 ${!ps.active?'opacity-40 pointer-events-none':''}">
          <div class="flex-1 space-y-1">
            <select class="text-xs w-full px-2 py-1.5 rounded-lg border border-outline-variant/20" onchange="Calculator._setIOStaff(${wi},${act.id},'${p.id}',${si},'profileId',this.value)">${profOpts}</select>
            <div class="flex gap-2">
              <div class="w-20"><label class="text-[9px] text-on-surface-variant">Days</label>
                <input type="number" value="${s.days}" min="0" class="w-full text-xs px-2 py-1 rounded border border-outline-variant/20" onchange="Calculator._setIOStaff(${wi},${act.id},'${p.id}',${si},'days',this.value)"></div>
              <div class="flex-1"><label class="text-[9px] text-on-surface-variant">Tasks</label>
                <input type="text" value="${s.tasks||''}" placeholder="Brief description of tasks..." class="w-full text-xs px-2 py-1 rounded border border-outline-variant/20" onchange="Calculator._setIOStaff(${wi},${act.id},'${p.id}',${si},'tasks',this.value)"></div>
            </div>
            <div class="text-[10px] font-mono" style="color:${color}">${s.days} days \u00D7 \u20AC${rate} = ${euros(s.days*rate)}</div>
          </div>
          <button onclick="Calculator._removeIOStaff(${wi},${act.id},'${p.id}',${si})" class="text-on-surface-variant/30 hover:text-error mt-1 text-base leading-none">\u00D7</button>
        </div>`;
      }).join('');

      return `<div class="rounded-xl border border-outline-variant/20 overflow-hidden mb-2">
        <div class="flex items-center gap-2 px-3 py-2" style="background:${bg}">
          <input type="checkbox" ${ps.active?'checked':''} class="w-3.5 h-3.5 accent-primary" onchange="Calculator._setIOPartnerActive(${wi},${act.id},'${p.id}',this.checked)">
          <span class="text-xs font-bold flex-1" style="color:${color}">${p.name||'P'+(i+1)}</span>
          <span class="text-[10px] font-mono font-semibold" style="color:${color}">${ps.active?euros(pTotal):'\u2014'}</span>
        </div>
        ${ps.active?`<div class="px-3 py-2">${staffRows}
          <button onclick="Calculator._addIOStaff(${wi},${act.id},'${p.id}')" class="text-[10px] font-semibold text-primary hover:underline">+ Add worker</button>
        </div>`:''}
      </div>`;
    }).join('');

    return `<div class="text-xs text-on-surface-variant mb-2">Assign staff per partner. Uncheck partners not involved. <span class="font-mono font-semibold text-primary">${euros(totalCost)}</span></div>${blocks}`;
  }

  /* ── ME fields ──────────────────────────────────────────────── */

  function buildMEFields(act, wi) {
    if (!act.me_events) { act.me_events = {}; state.partners.forEach(p => { act.me_events[p.id] = { active:true, local_pax:20, intl_pax:0, local_rate:100, intl_rate:200 }; }); }

    const rows = state.partners.map((p, i) => {
      const ev = act.me_events[p.id] || { active:true, local_pax:20, intl_pax:0, local_rate:100, intl_rate:200 };
      const total = ev.active ? ev.local_pax * ev.local_rate + ev.intl_pax * ev.intl_rate : 0;
      return `<tr style="opacity:${ev.active?1:.4}">
        <td><label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${ev.active?'checked':''} class="w-3.5 h-3.5" onchange="Calculator._setME(${wi},${act.id},'${p.id}','active',this.checked)">
          <span class="font-semibold text-sm" style="color:${WP_COLORS[i%WP_COLORS.length]}">${p.name||'P'+(i+1)}</span>
        </label></td>
        <td class="text-center"><div class="flex items-center gap-1 justify-center"><input type="number" value="${ev.local_pax}" min="0" class="w-14" ${!ev.active?'disabled':''} onchange="Calculator._setME(${wi},${act.id},'${p.id}','local_pax',this.value)"><span class="text-[10px]">×</span><input type="number" value="${ev.local_rate}" min="0" class="w-16" ${!ev.active?'disabled':''} onchange="Calculator._setME(${wi},${act.id},'${p.id}','local_rate',this.value)"></div></td>
        <td class="text-center"><div class="flex items-center gap-1 justify-center"><input type="number" value="${ev.intl_pax}" min="0" class="w-14" ${!ev.active?'disabled':''} onchange="Calculator._setME(${wi},${act.id},'${p.id}','intl_pax',this.value)"><span class="text-[10px]">×</span><input type="number" value="${ev.intl_rate}" min="0" class="w-16" ${!ev.active?'disabled':''} onchange="Calculator._setME(${wi},${act.id},'${p.id}','intl_rate',this.value)"></div></td>
        <td class="text-right font-mono font-semibold text-sm">${ev.active ? euros(total) : '—'}</td>
      </tr>`;
    }).join('');

    return `<div class="overflow-x-auto"><table class="calc-table"><thead><tr>
      <th class="text-left">Partner</th><th class="text-center">Local pax × €</th><th class="text-center">Intl pax × €</th><th class="text-right">Total</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ── Generic per-partner fields ─────────────────────────────── */

  function buildPerPartnerFields(act, wi, stateKey, defaults, buildCells, calcTotal, colHeaders) {
    if (!act[stateKey]) { act[stateKey] = {}; state.partners.forEach(p => { act[stateKey][p.id] = { active:true, ...defaults }; }); }
    const rows = state.partners.map((p, i) => {
      const d = act[stateKey][p.id] || { active:true, ...defaults };
      const total = d.active ? calcTotal(d) : 0;
      return `<tr style="opacity:${d.active?1:.4}">
        <td><label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${d.active?'checked':''} class="w-3.5 h-3.5" onchange="Calculator._setPartnerDetail(${wi},${act.id},'${stateKey}','${p.id}','active',this.checked)">
          <span class="font-semibold text-sm" style="color:${WP_COLORS[i%WP_COLORS.length]}">${p.name||'P'+(i+1)}</span>
        </label></td>
        ${buildCells(p.id, d)}
        <td class="text-right font-mono font-semibold text-sm">${d.active ? euros(total) : '—'}</td>
      </tr>`;
    }).join('');

    return `<div class="overflow-x-auto"><table class="calc-table"><thead><tr>
      <th class="text-left">Partner</th>${colHeaders.map(h => `<th class="text-center">${h}</th>`).join('')}<th class="text-right">Total</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ── Depreciation fields ────────────────────────────────────── */

  function buildDepreciationFields(act, wi) {
    if (!act.note_partners) { act.note_partners = {}; state.partners.forEach(p => { act.note_partners[p.id] = { active:true, note:'', amount:0, project_pct:100, lifetime_pct:100 }; }); }
    const rows = state.partners.map((p, i) => {
      const np = act.note_partners[p.id] || { active:true, note:'', amount:0, project_pct:100, lifetime_pct:100 };
      const charged = np.active ? calcDepreciation(np) : 0;
      return `<tr style="opacity:${np.active?1:.4}">
        <td><label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${np.active?'checked':''} class="w-3.5 h-3.5" onchange="Calculator._setPartnerDetail(${wi},${act.id},'note_partners','${p.id}','active',this.checked)">
          <span class="font-semibold text-sm" style="color:${WP_COLORS[i%WP_COLORS.length]}">${p.name||'P'+(i+1)}</span>
        </label></td>
        <td><input type="text" value="${np.note||''}" placeholder="Description..." class="w-full text-xs" ${!np.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'note_partners','${p.id}','note',this.value)"></td>
        <td class="text-right"><input type="number" value="${np.amount||''}" min="0" class="w-20" ${!np.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'note_partners','${p.id}','amount',this.value)"></td>
        <td class="text-right"><input type="number" value="${np.project_pct??100}" min="0" max="100" class="w-16" ${!np.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'note_partners','${p.id}','project_pct',this.value)"></td>
        <td class="text-right"><input type="number" value="${np.lifetime_pct??100}" min="0" max="100" class="w-16" ${!np.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'note_partners','${p.id}','lifetime_pct',this.value)"></td>
        <td class="text-right font-mono font-semibold text-sm">${np.active && charged ? euros(charged) : '—'}</td>
      </tr>`;
    }).join('');

    return `<div class="text-xs text-on-surface-variant mb-2"><strong>Charged = Investment × % project use × % useful life</strong></div>
    <div class="overflow-x-auto"><table class="calc-table"><thead><tr>
      <th class="text-left">Partner</th><th>Description</th><th class="text-right">Invest €</th><th class="text-right">% Project</th><th class="text-right">% Life</th><th class="text-right">Charged</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ── Note+Amount fields ─────────────────────────────────────── */

  function buildNoteAmountFields(act, wi) {
    if (!act.note_partners) { act.note_partners = {}; state.partners.forEach(p => { act.note_partners[p.id] = { active:true, note:'', amount:0 }; }); }
    const rows = state.partners.map((p, i) => {
      const np = act.note_partners[p.id] || { active:true, note:'', amount:0 };
      return `<tr style="opacity:${np.active?1:.4}">
        <td><label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${np.active?'checked':''} class="w-3.5 h-3.5" onchange="Calculator._setPartnerDetail(${wi},${act.id},'note_partners','${p.id}','active',this.checked)">
          <span class="font-semibold text-sm" style="color:${WP_COLORS[i%WP_COLORS.length]}">${p.name||'P'+(i+1)}</span>
        </label></td>
        <td><input type="text" value="${np.note||''}" placeholder="Description..." class="w-full text-xs" ${!np.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'note_partners','${p.id}','note',this.value)"></td>
        <td class="text-right"><input type="number" value="${np.amount||''}" min="0" class="w-24" ${!np.active?'disabled':''} onchange="Calculator._setPartnerDetail(${wi},${act.id},'note_partners','${p.id}','amount',this.value)"></td>
        <td class="text-right font-mono font-semibold text-sm">${np.active && np.amount ? euros(np.amount) : '—'}</td>
      </tr>`;
    }).join('');

    return `<div class="overflow-x-auto"><table class="calc-table"><thead><tr>
      <th class="text-left">Partner</th><th>Description</th><th class="text-right">Amount €</th><th class="text-right">Total</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     CALCULATION ENGINE
     ══════════════════════════════════════════════════════════════ */

  function calcActivity(act) {
    const n = state.partners.length;
    const mo = getProjectMonths();
    const og = 70; // org cost per person per day

    switch (act.type) {
      case 'mgmt': {
        const app = (act.rate_applicant||500) * mo;
        const partners = (act.rate_partner||250) * mo * (n - 1);
        return { total: app + partners, app, partners };
      }
      case 'meeting': case 'ltta': {
        const pax = act.pax || 2;
        const days = act.days || 3;
        let travel = 0, aloj = 0;
        const activePartners = state.partners.filter(p => (act.participants||{})[p.id] !== false);
        activePartners.forEach(p => {
          const isHost = p.id === act.host;
          if (!isHost) travel += getRouteCost(p.id, act.host) * pax;
          aloj += pax * days * getPartnerPerdiemTotal(p.id);
        });
        const orgTotal = activePartners.length * pax * days * og;
        const localPax = act.local_pax || 0;
        const localCost = localPax * ((act.local_transport||25) + days * getPartnerPerdiemTotal(act.host));
        return { total: travel + aloj + orgTotal + localCost, viaje: travel, aloj, org: orgTotal, localCost };
      }
      case 'me': {
        if (!act.me_events) return { total:0 };
        let total = 0;
        const perPartner = [];
        state.partners.forEach(p => {
          const ev = act.me_events[p.id];
          if (!ev || !ev.active) return;
          const t = ev.local_pax * ev.local_rate + ev.intl_pax * ev.intl_rate;
          total += t;
          perPartner.push({ pid:p.id, name:p.name, total:t });
        });
        return { total, perPartner };
      }
      case 'io': {
        let total = 0;
        if (act.io_staff) {
          Object.entries(act.io_staff).forEach(([pid, ps]) => {
            if (!ps.active) return;
            ps.staff.forEach(s => { total += (s.days||0) * getPartnerDayRate(pid, s.profileId); });
          });
        } else if (act.io_partner_days) {
          Object.entries(act.io_partner_days).forEach(([pid, days]) => {
            const profId = act.io_partner_profiles ? (act.io_partner_profiles[pid] || null) : null;
            total += (days||0) * getPartnerDayRate(pid, profId);
          });
        }
        return { total };
      }
      case 'local_ws': {
        if (!act.ws_partners) return { total:0 };
        let total = 0;
        state.partners.forEach(p => { const w = act.ws_partners[p.id]; if (w?.active) total += (w.ws_pax||0)*(w.ws_n||0)*(w.ws_cost||0); });
        return { total };
      }
      case 'campaign': {
        if (!act.camp_partners) return { total:0 };
        let total = 0;
        state.partners.forEach(p => { const c = act.camp_partners[p.id]; if (c?.active) total += (c.monthly||0)*(c.months||0); });
        return { total };
      }
      case 'equipment': case 'goods': case 'consumables': case 'other': {
        if (!act.note_partners) return { total:0 };
        let total = 0;
        state.partners.forEach(p => { const np = act.note_partners[p.id]; if (np?.active) total += calcDepreciation(np); });
        return { total };
      }
      case 'website': case 'artistic': {
        if (!act.note_partners) return { total:0 };
        let total = 0;
        state.partners.forEach(p => { const np = act.note_partners[p.id]; if (np?.active) total += np.amount||0; });
        return { total };
      }
      default: return { total:0 };
    }
  }

  function recalcWP(wi) {
    const wp = state.wps[wi];
    let wpTotal = 0;
    const mo = getProjectMonths();
    wp.activities.forEach(act => {
      const res = calcActivity(act);
      const def = ACT_TYPES[act.type];
      const color = def?.color || '#474551';
      wpTotal += res.total;
      const el = $(`calc-act-result-${act.id}`);
      if (!el) return;

      if (act.type === 'mgmt') {
        const appCost = (act.rate_applicant||500) * mo;
        const partnerCost = (act.rate_partner||250) * mo;
        const rows = state.partners.map((p, i) => {
          const isApp = i === 0;
          const cost = isApp ? appCost : partnerCost;
          const rate = isApp ? (act.rate_applicant||500) : (act.rate_partner||250);
          return `<div class="flex justify-between text-xs py-0.5"><span class="text-on-surface-variant">${p.name||'P'+(i+1)} <span class="text-[10px] text-on-surface-variant/50">${rate}/mo × ${mo}mo</span></span><span class="font-mono font-semibold">${euros(cost)}</span></div>`;
        }).join('');
        el.innerHTML = `${rows}<div class="flex justify-between text-sm font-bold pt-1 mt-1 border-t border-outline-variant/10" style="color:${color}"><span>Total</span><span>${euros(res.total)}</span></div>`;

      } else if (act.type === 'meeting' || act.type === 'ltta') {
        const lines = [];
        if (res.viaje) lines.push(`<div class="flex justify-between text-xs py-0.5"><span class="text-on-surface-variant">Travel</span><span class="font-mono">${euros(res.viaje)}</span></div>`);
        if (res.aloj) lines.push(`<div class="flex justify-between text-xs py-0.5"><span class="text-on-surface-variant">Accommodation & subsistence</span><span class="font-mono">${euros(res.aloj)}</span></div>`);
        if (res.org) lines.push(`<div class="flex justify-between text-xs py-0.5"><span class="text-on-surface-variant">Organisation</span><span class="font-mono">${euros(res.org)}</span></div>`);
        if (res.localCost) lines.push(`<div class="flex justify-between text-xs py-0.5"><span class="text-on-surface-variant">Local transport</span><span class="font-mono">${euros(res.localCost)}</span></div>`);
        el.innerHTML = lines.join('') + `<div class="flex justify-between text-sm font-bold pt-1 mt-1 border-t border-outline-variant/10" style="color:${color}"><span>Total</span><span>${euros(res.total)}</span></div>`;

      } else if (act.type === 'io' && act.io_staff) {
        const rows = state.partners.map((p, i) => {
          const ps = act.io_staff[p.id];
          if (!ps?.active) return '';
          const pTotal = ps.staff.reduce((s, st) => s + (st.days||0) * getPartnerDayRate(p.id, st.profileId), 0);
          return `<div class="flex justify-between text-xs py-0.5"><span class="text-on-surface-variant">${p.name||'P'+(i+1)} <span class="text-[10px] text-on-surface-variant/50">${ps.staff.length} worker${ps.staff.length>1?'s':''}</span></span><span class="font-mono">${euros(pTotal)}</span></div>`;
        }).filter(Boolean).join('');
        el.innerHTML = rows + `<div class="flex justify-between text-sm font-bold pt-1 mt-1 border-t border-outline-variant/10" style="color:${color}"><span>Total</span><span>${euros(res.total)}</span></div>`;

      } else if (res.perPartner && res.perPartner.length) {
        const rows = res.perPartner.map(pp =>
          `<div class="flex justify-between text-xs py-0.5"><span class="text-on-surface-variant">${pp.name||'Partner'}</span><span class="font-mono">${euros(pp.total)}</span></div>`
        ).join('');
        el.innerHTML = rows + `<div class="flex justify-between text-sm font-bold pt-1 mt-1 border-t border-outline-variant/10" style="color:${color}"><span>Total</span><span>${euros(res.total)}</span></div>`;

      } else {
        el.innerHTML = `<div class="flex justify-end text-sm font-bold" style="color:${color}">${euros(res.total)}</div>`;
      }
    });
    const totEl = $(`calc-wp-total-${wi}`);
    if (totEl) totEl.textContent = euros(wpTotal);
    refreshSummaryBar();
    return wpTotal;
  }

  function refreshSummaryBar() {
    const { totalProject } = getFinancials();
    const direct = state.wps.reduce((s, wp) => s + wp.activities.reduce((ss, a) => ss + calcActivity(a).total, 0), 0);
    const { total } = applyIndirectCosts(direct);
    const diff = totalProject - total;
    const usePct = totalProject > 0 ? Math.min(total / totalProject * 100, 100).toFixed(1) : 0;

    const elTotal = $('calc-live-total');
    const elDiff = $('calc-live-diff');
    const elBar = $('calc-live-bar');
    if (elTotal) elTotal.textContent = euros(total);
    if (elDiff) { elDiff.textContent = (diff >= 0 ? '+ ' : '− ') + euros(Math.abs(diff)); elDiff.style.color = diff < 0 ? '#FCA5A5' : ''; }
    if (elBar) elBar.style.width = usePct + '%';
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 4: RESULTS
     ══════════════════════════════════════════════════════════════ */

  function renderResults(container) {
    state.wps.forEach((_, wi) => recalcWP(wi));
    const { euGrant, cofinPct, totalProject, ownFunds, indirectPct } = getFinancials();
    const n = state.partners.length;
    const mo = getProjectMonths();
    const ownPct = 100 - cofinPct;

    const wpResults = state.wps.map((wp, wi) => {
      const acts = wp.activities.map(a => ({ ...a, ...calcActivity(a) }));
      const total = acts.reduce((s, a) => s + a.total, 0);
      return { ...wp, acts, total, color: WP_COLORS[wi%WP_COLORS.length], bg: WP_BG[wi%WP_BG.length] };
    });

    const directCosts = wpResults.reduce((s, w) => s + w.total, 0);
    const { indirect, total: subtotal } = applyIndirectCosts(directCosts);
    const over = subtotal > totalProject;

    container.innerHTML = `
      <h2 class="font-headline text-lg font-bold mb-1">Budget Summary</h2>
      <p class="text-sm text-on-surface-variant mb-4">${state.project?.name || 'Project'} · ${n} partners · ${mo} months</p>

      <!-- Hero -->
      <div class="bg-primary text-white rounded-xl p-5 mb-5">
        <div class="text-[10px] uppercase tracking-wider opacity-50 mb-1">Total project budget (direct + indirect)</div>
        <div class="font-headline text-3xl font-bold">${euros(subtotal)}</div>
        <div class="flex gap-5 mt-2 flex-wrap text-xs opacity-70">
          <span>Direct: <strong>${euros(directCosts)}</strong></span>
          <span>Indirect ${indirectPct}%: <strong>${euros(indirect)}</strong></span>
          <span>Target: <strong>${euros(totalProject)}</strong></span>
        </div>
        ${over ? `<div class="mt-2"><span class="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-900/50 text-red-200">Exceeds target by ${euros(subtotal - totalProject)}</span></div>` : ''}
      </div>

      <!-- Tabs -->
      <div class="flex gap-0 border-b-2 border-outline-variant/20 mb-5">
        <button class="calc-res-tab active" onclick="Calculator._switchResTab('summary')">Summary</button>
        <button class="calc-res-tab" onclick="Calculator._switchResTab('wp')">By WP</button>
        <button class="calc-res-tab" onclick="Calculator._switchResTab('partner')">By Partner</button>
      </div>

      <div id="calc-res-summary">${buildResSummary(wpResults, directCosts, indirect, subtotal, totalProject, indirectPct)}</div>
      <div id="calc-res-wp" style="display:none">${buildResWP(wpResults, directCosts, indirect, subtotal, indirectPct)}</div>
      <div id="calc-res-partner" style="display:none">${buildResPartner(wpResults, directCosts, indirect, subtotal, totalProject, indirectPct)}</div>

      <!-- Financing -->
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-5 mt-5">
        <h3 class="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Financing Breakdown</h3>
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="rounded-lg p-4 bg-blue-50 border-l-4 border-blue-600">
            <div class="text-[11px] font-bold text-blue-600 uppercase mb-1">EU Grant · ${cofinPct}%</div>
            <div class="font-headline text-xl font-bold text-blue-700">${euros(euGrant)}</div>
          </div>
          <div class="rounded-lg p-4 bg-amber-50 border-l-4 border-amber-600">
            <div class="text-[11px] font-bold text-amber-600 uppercase mb-1">Own Funds · ${ownPct}%</div>
            <div class="font-headline text-xl font-bold text-amber-700">${euros(ownFunds)}</div>
          </div>
        </div>
        <div class="h-8 rounded-lg overflow-hidden flex">
          <div class="bg-blue-600 flex items-center justify-center" style="width:${cofinPct}%"><span class="text-xs font-bold text-white">EU ${cofinPct}%</span></div>
          <div class="bg-amber-600 flex items-center justify-center" style="width:${ownPct}%"><span class="text-xs font-bold text-white">Own ${ownPct}%</span></div>
        </div>
      </div>

      ${_embeddedMode ? embeddedNavButtons(4, 6, 'Gantt \u2192') : navButtons(3, 5, 'Gantt \u2192')}
    `;
  }

  function buildResSummary(wpR, direct, indirect, subtotal, target, indPct) {
    return `<div class="grid grid-cols-[1fr_280px] gap-5 items-start max-lg:grid-cols-1">
      <div class="space-y-2">
        ${wpR.map((wp, wi) => {
          const wpInd = wp.total * (indPct/100);
          const wpFull = wp.total + wpInd;
          return `<div class="rounded-lg border border-outline-variant/20 p-3" style="border-left:3px solid ${wp.color}">
            <div class="flex justify-between items-baseline mb-1">
              <span class="text-xs font-semibold" style="color:${wp.color}">${wpLabel(wp, wi)}</span>
              <span class="font-mono text-sm font-semibold">${euros(wpFull)}</span>
            </div>
            <div class="text-[11px] text-on-surface-variant">${pct(wpFull, target)} · direct ${euros(wp.total)} + indirect ${euros(wpInd)}</div>
            <div class="h-1 rounded bg-surface-container-high mt-1.5"><div class="h-full rounded transition-all" style="width:${pct(wpFull, target)};background:${wp.color}"></div></div>
          </div>`;
        }).join('')}
      </div>
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 sticky top-5">
        <h4 class="text-xs font-bold text-on-surface-variant uppercase mb-3">Totals</h4>
        ${wpR.map((wp, wi) => `<div class="flex justify-between py-1 text-xs border-b border-outline-variant/10"><span style="color:${wp.color}" class="font-medium">${wpLabel(wp, wi)}</span><span class="font-mono">${euros(wp.total)}</span></div>`).join('')}
        <div class="flex justify-between py-1.5 text-xs border-t border-outline-variant/30 mt-1 pt-2 text-on-surface-variant"><span>Direct costs</span><span class="font-mono">${euros(direct)}</span></div>
        <div class="flex justify-between py-1 text-xs text-on-surface-variant"><span>Indirect ${indPct}%</span><span class="font-mono">+ ${euros(indirect)}</span></div>
        <div class="flex justify-between py-2 font-bold text-sm border-t-2 border-outline-variant/30 mt-1"><span>Total</span><span class="font-mono">${euros(subtotal)}</span></div>
      </div>
    </div>`;
  }

  function buildResWP(wpR, direct, indirect, subtotal, indPct) {
    return wpR.map((wp, wi) => {
      const wpInd = wp.total * (indPct/100);
      return `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 mb-3" style="border-top:3px solid ${wp.color}">
        <div class="flex justify-between items-center mb-3">
          <span class="font-headline font-bold text-sm" style="color:${wp.color}">${wpLabel(wp, wi)}</span>
          <span class="font-mono font-bold">${euros(wp.total + wpInd)}</span>
        </div>
        ${wp.acts.map(a => {
          const def = ACT_TYPES[a.type];
          return `<div class="flex justify-between items-baseline py-1.5 border-b border-outline-variant/10 text-sm">
            <span><span class="material-symbols-outlined text-[14px] align-middle mr-1" style="color:${def.color}">${def.icon}</span>${a.label}</span>
            <span class="font-mono font-semibold">${euros(a.total)}</span>
          </div>`;
        }).join('')}
        <div class="flex justify-between py-1.5 text-xs text-on-surface-variant mt-1"><span>Direct</span><span class="font-mono">${euros(wp.total)}</span></div>
        <div class="flex justify-between py-1.5 text-xs text-on-surface-variant"><span>+ Indirect ${indPct}%</span><span class="font-mono">+ ${euros(wpInd)}</span></div>
        <div class="flex justify-between py-2 font-bold text-sm rounded px-2 mt-1" style="background:${wp.bg};color:${wp.color}"><span>Total ${wp.name}</span><span class="font-mono">${euros(wp.total + wpInd)}</span></div>
      </div>`;
    }).join('') + `
      <div class="bg-primary text-white rounded-xl p-4 flex justify-between items-center">
        <span class="font-headline font-bold">TOTAL PROJECT</span>
        <span class="font-mono text-xl font-bold">${euros(subtotal)}</span>
      </div>`;
  }

  function buildResPartner(wpR, direct, indirect, subtotal, target, indPct) {
    const n = state.partners.length;
    const mo = getProjectMonths();

    function partnerShare(act, pi) {
      const p = state.partners[pi];
      if (!p) return 0;
      const res = calcActivity(act);
      if (act.type === 'mgmt') return pi === 0 ? res.app : (act.rate_partner||250) * mo;
      if (act.type === 'meeting' || act.type === 'ltta') {
        if (p.id === act.host) return res.org / (state.partners.length);
        if ((act.participants||{})[p.id] === false) return 0;
        return getRouteCost(p.id, act.host) * (act.pax||2) + (act.pax||2) * (act.days||3) * getPartnerPerdiemTotal(p.id) + res.org / state.partners.length;
      }
      if (act.type === 'me') { const ev = act.me_events?.[p.id]; return (ev?.active) ? ev.local_pax*ev.local_rate + ev.intl_pax*ev.intl_rate : 0; }
      if (act.type === 'local_ws') { const w = act.ws_partners?.[p.id]; return w?.active ? (w.ws_pax||0)*(w.ws_n||0)*(w.ws_cost||0) : 0; }
      if (act.type === 'campaign') { const c = act.camp_partners?.[p.id]; return c?.active ? (c.monthly||0)*(c.months||0) : 0; }
      if (['equipment','goods','consumables','other'].includes(act.type)) { const np = act.note_partners?.[p.id]; return np?.active ? calcDepreciation(np) : 0; }
      if (['website','artistic'].includes(act.type)) { const np = act.note_partners?.[p.id]; return np?.active ? (np.amount||0) : 0; }
      if (act.type === 'io') { const ps = act.io_staff?.[p.id]; if (!ps?.active) return 0; return ps.staff.reduce((s,st) => s + (st.days||0) * getPartnerDayRate(p.id, st.profileId), 0); }
      return res.total / n;
    }

    return state.partners.map((p, i) => {
      let grand = 0;
      const lines = [];
      wpR.forEach((wp, wi) => {
        wp.acts.forEach(a => {
          const share = partnerShare(a, i);
          grand += share;
          lines.push({ wp: wpLabel(wp, wi), wpColor: wp.color, label: a.label, share });
        });
      });
      const c = WP_COLORS[i%WP_COLORS.length];
      const grandPct = target > 0 ? (grand / target * 100).toFixed(1) : '0';
      return `<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 mb-3" style="border-top:3px solid ${c}">
        <div class="flex items-center gap-2 mb-3">
          <span class="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center" style="background:${c}">${i+1}</span>
          <span class="font-headline font-bold">${p.name||'Partner '+(i+1)}</span>
          ${i===0?'<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">applicant</span>':''}
          <span class="ml-auto font-mono font-bold" style="color:${c}">${euros(grand)}</span>
          <span class="text-xs text-on-surface-variant">${grandPct}%</span>
        </div>
        ${lines.filter(l=>l.share>0).map(l => `<div class="flex justify-between py-1 text-xs border-b border-outline-variant/10">
          <span><span class="font-semibold" style="color:${l.wpColor}">${l.wp}</span> · ${l.label}</span>
          <span class="font-mono">${euros(l.share)}</span>
        </div>`).join('')}
        <div class="flex justify-between py-2 font-bold text-sm mt-1"><span>Direct costs</span><span class="font-mono">${euros(grand)}</span></div>
        <div class="flex justify-between py-1 text-xs text-on-surface-variant"><span>+ Indirect ${indPct}%</span><span class="font-mono">+ ${euros(grand*indPct/100)}</span></div>
        <div class="flex justify-between py-2 font-bold text-sm rounded px-2 mt-1" style="background:${WP_BG[i%WP_BG.length]};color:${c}"><span>TOTAL (with indirect)</span><span class="font-mono">${euros(grand*(1+indPct/100))}</span></div>
        <div class="h-1 rounded bg-surface-container-high mt-2"><div class="h-full rounded" style="width:${grandPct}%;background:${c}"></div></div>
      </div>`;
    }).join('') + `
      <div class="bg-primary text-white rounded-xl p-4 flex justify-between items-center">
        <span class="font-headline font-bold">TOTAL PROJECT</span>
        <span class="font-mono text-xl font-bold">${euros(subtotal)}</span>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     STEP 5: GANTT
     ══════════════════════════════════════════════════════════════ */

  let ganttView = 'months';
  const ganttCollapsed = {};

  function renderGantt(container) {
    const ps = getProjectStart();
    if (!ps) {
      container.innerHTML = `<div class="text-center py-16 text-on-surface-variant">Set a project start date in Intake to see the Gantt chart.</div>${_embeddedMode ? embeddedNavButtons(5, 7, 'Resumen \u2192') : navButtons(4, null)}`;
      return;
    }

    container.innerHTML = `
      <h2 class="font-headline text-lg font-bold mb-1">Project Timeline</h2>
      <p class="text-sm text-on-surface-variant mb-4">Gantt chart of all WPs and activities.</p>

      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-1">
          <span class="text-xs font-semibold text-on-surface-variant">View:</span>
          <button id="calc-gantt-months" class="px-3 py-1 text-xs font-semibold rounded ${ganttView==='months'?'bg-primary text-white':'bg-surface-container-high text-on-surface-variant'}" onclick="Calculator._setGanttView('months')">Months</button>
          <button id="calc-gantt-weeks" class="px-3 py-1 text-xs font-semibold rounded ${ganttView==='weeks'?'bg-primary text-white':'bg-surface-container-high text-on-surface-variant'}" onclick="Calculator._setGanttView('weeks')">Weeks</button>
        </div>
        <div class="ml-auto flex gap-2">
          <button class="px-2 py-1 text-[11px] font-semibold border border-outline-variant/30 rounded hover:bg-surface-container-high" onclick="Calculator._ganttCollapseAll()">− Collapse</button>
          <button class="px-2 py-1 text-[11px] font-semibold border border-outline-variant/30 rounded hover:bg-surface-container-high" onclick="Calculator._ganttExpandAll()">+ Expand</button>
        </div>
      </div>

      <div class="overflow-x-auto border border-outline-variant/20 rounded-xl bg-white">
        <div id="calc-gantt-inner" style="min-width:800px"></div>
      </div>
      <div id="calc-gantt-legend" class="flex flex-wrap gap-3 mt-3 text-xs"></div>
      <div id="calc-gantt-tooltip" class="calc-gantt-tip"></div>

      ${_embeddedMode ? embeddedNavButtons(5, 7, 'Resumen \u2192') : navButtons(4, null)}
    `;
    buildGanttChart();
  }

  function buildGanttChart() {
    const ps = getProjectStart();
    if (!ps) return;
    const pe = addMonths(ps, getProjectMonths()); pe.setDate(pe.getDate()-1);
    const totalMs = pe - ps;
    const LABEL_W = 180;

    const cols = [];
    if (ganttView === 'months') {
      let d = new Date(ps.getFullYear(), ps.getMonth(), 1), mo = 1;
      while (d <= pe) { cols.push({ label: d.toLocaleDateString('es-ES',{month:'short'}).toUpperCase(), sub: d.getFullYear().toString().slice(-2) }); d.setMonth(d.getMonth()+1); mo++; }
    } else {
      let d = new Date(ps); const dow = d.getDay(); d.setDate(d.getDate()-(dow===0?6:dow-1)); let wk = 1;
      while (d <= pe) { cols.push({ label:'S'+wk, sub:d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'}) }); d.setDate(d.getDate()+7); wk++; }
    }

    function posW(ds, de) {
      if (!ds||!de) return null;
      const s = new Date(ds), e = new Date(de);
      if (s > pe || e < ps) return { out:true };
      const cs = s < ps ? ps : s, ce = e > pe ? pe : e;
      return { left:((cs-ps)/totalMs*100).toFixed(3)+'%', width:((ce-cs+86400000)/totalMs*100).toFixed(3)+'%', days: Math.round((ce-cs)/86400000)+1 };
    }

    const today = new Date();
    const showToday = today >= ps && today <= pe;
    const todayPct = showToday ? ((today-ps)/totalMs*100).toFixed(3)+'%' : null;

    const stripeCols = cols.map((_,ci) => `<div style="flex:1;border-left:1px solid #e5e7eb;background:${ci%2===0?'transparent':'rgba(0,0,0,.012)'}"></div>`).join('');
    const headerCols = cols.map((c,ci) => `<div style="flex:1;text-align:center;padding:4px 0;background:${ci%2===0?'#eceef0':'#e6e8ea'};border-left:1px solid #d1d5db"><div style="font-size:11px;font-weight:700;color:#374151">${c.label}</div><div style="font-size:9px;color:#9ca3af">${c.sub}</div></div>`).join('');

    let html = `<div style="display:flex;position:sticky;top:0;z-index:30;box-shadow:0 2px 6px rgba(0,0,0,.08)">
      <div style="width:${LABEL_W}px;flex-shrink:0;background:#1e293b;display:flex;align-items:center;padding:0 14px"><span style="font-size:11px;font-weight:700;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:.06em">Activity</span></div>
      <div style="flex:1;display:flex">${headerCols}</div>
    </div>`;

    state.wps.forEach((wp, wi) => {
      const c = WP_COLORS[wi%WP_COLORS.length];
      const collapsed = ganttCollapsed[wi];

      html += `<div style="display:flex;align-items:stretch;background:${c}12;border-top:3px solid ${c};cursor:pointer;min-height:42px" onclick="Calculator._ganttToggle(${wi})">
        <div style="width:${LABEL_W}px;flex-shrink:0;padding:0 10px 0 14px;display:flex;align-items:center;gap:8px;overflow:hidden">
          <span style="font-size:10px;color:${c};font-weight:800">${collapsed?'▶':'▼'}</span>
          <span style="width:10px;height:10px;border-radius:50%;background:${c}"></span>
          <span style="font-size:12px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${wpLabel(wp,wi)}</span>
        </div>
        <div style="flex:1;position:relative;display:flex"><div style="position:absolute;inset:0;display:flex">${stripeCols}</div>
          ${todayPct?`<div style="position:absolute;left:${todayPct};top:0;bottom:0;width:2px;background:#ef4444;opacity:.6;z-index:5"></div>`:''}
        </div>
      </div>`;

      if (!collapsed) {
        wp.activities.forEach((act, ai) => {
          const def = ACT_TYPES[act.type];
          const pos = posW(act.date_start, act.date_end);
          let bar = '';
          if (pos && !pos.out) {
            bar = `<div style="position:absolute;left:${pos.left};width:${pos.width};top:50%;transform:translateY(-50%);height:22px;background:${c};border-radius:5px;display:flex;align-items:center;padding:0 8px;overflow:hidden;z-index:4;box-shadow:0 1px 3px rgba(0,0,0,.15)">
              <span style="font-size:10px;color:#fff;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${act.label}</span>
            </div>`;
          }

          html += `<div style="display:flex;align-items:stretch;background:${ai%2===0?'#fff':'#f9fafb'};border-top:1px solid #e5e7eb;min-height:36px">
            <div style="width:${LABEL_W}px;flex-shrink:0;padding:0 8px 0 32px;display:flex;align-items:center;gap:7px;overflow:hidden">
              <span class="material-symbols-outlined" style="font-size:14px;color:${def.color}">${def.icon}</span>
              <span style="font-size:11px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${act.label}</span>
            </div>
            <div style="flex:1;position:relative;display:flex"><div style="position:absolute;inset:0;display:flex">${stripeCols}</div>${bar}
              ${todayPct?`<div style="position:absolute;left:${todayPct};top:0;bottom:0;width:2px;background:#ef4444;opacity:.5;z-index:5"></div>`:''}
            </div>
          </div>`;
        });
      }
    });

    $('calc-gantt-inner').innerHTML = html;
    $('calc-gantt-legend').innerHTML = state.wps.map((wp, wi) => {
      const c = WP_COLORS[wi%WP_COLORS.length];
      return `<span class="flex items-center gap-1"><span class="w-3 h-3 rounded" style="background:${c}"></span>${wpLabel(wp,wi)}</span>`;
    }).join('') + (showToday ? '<span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-red-500"></span>Today</span>' : '');
  }

  /* ══════════════════════════════════════════════════════════════
     EVENT HANDLERS (exposed for onclick)
     ══════════════════════════════════════════════════════════════ */

  function setPerdiem(pid, field, value) {
    if (!state.partnerRates[pid]) state.partnerRates[pid] = { aloj:105, mant:40 };
    state.partnerRates[pid][field] = parseFloat(value) || 0;
    const r = state.partnerRates[pid];
    const el = $('calc-pd-total-' + pid);
    if (el) el.textContent = euros((r.aloj||0) + (r.mant||0));
  }

  function setWorkerRate(id, field, value) {
    const w = state.workerRates.find(x => x.id === id);
    if (!w) return;
    w[field] = field === 'rate' ? (parseFloat(value)||0) : value;
  }
  function addWorkerRate(pid) {
    state.workerRates.push({ id: ++state.wrCounter, pid, category:'New category', rate:100 });
    const el = $('calc-worker-rates');
    if (el) el.innerHTML = buildWorkerRatesHTML();
  }
  function removeWorkerRate(id) {
    state.workerRates = state.workerRates.filter(w => w.id !== id);
    const el = $('calc-worker-rates');
    if (el) el.innerHTML = buildWorkerRatesHTML();
  }

  /* ── Extra destinations ──────────────────────────────────────── */
  function addExtraDest() {
    state.extraDestCounter++;
    state.extraDests.push({ id: '_ed' + state.extraDestCounter, name: '', country: '' });
    renderRoutes(getRouteContainer());
  }

  function removeExtraDest(idx) {
    const removed = state.extraDests.splice(idx, 1)[0];
    if (removed) {
      // Clean up routes referencing this dest
      Object.keys(state.routes).forEach(k => {
        if (k.includes(removed.id)) delete state.routes[k];
      });
    }
    renderRoutes(getRouteContainer());
  }

  function setExtraDest(idx, field, value) {
    if (state.extraDests[idx]) {
      state.extraDests[idx][field] = value;
    }
  }

  function setRouteBand(a, b, bandIdx) {
    const k = routeKey(a, b);
    if (!state.routes[k]) state.routes[k] = { km:0, green:false, custom_rate:null };
    const band = DISTANCE_BANDS[bandIdx] || DISTANCE_BANDS[0];
    state.routes[k].km = band.max === Infinity ? 8000 : Math.round((band.min + band.max) / 2);
    const official = state.routes[k].green ? band.green : band.std;
    state.routes[k].custom_rate = official;
    const offEl = $('calc-route-off-' + k);
    const custEl = $('calc-route-custom-' + k);
    if (offEl) offEl.textContent = '€' + official;
    if (custEl) custEl.value = official;
  }

  function getRouteContainer() {
    return $('intake-calc-container') || $('calc-step-container');
  }

  function setRoute(a, b, field, value) {
    const k = routeKey(a, b);
    if (!state.routes[k]) state.routes[k] = { km:0, green:false, custom_rate:null };
    if (field === 'green') {
      const r = state.routes[k];
      r.green = !!value;
      const band = getBand(r.km);
      const newOfficial = r.green ? band.green : band.std;
      r.custom_rate = newOfficial;
      renderRoutes(getRouteContainer());
    } else if (field === 'custom_rate') {
      state.routes[k].custom_rate = value === '' ? null : parseFloat(value)||0;
    }
  }

  function setWP(wi, field, value) { state.wps[wi][field] = value; }
  function setWPCat(wi, cat) {
    state.wps[wi]._cat = cat;
    const el = $('calc-wp-list');
    if (el) el.innerHTML = buildWPListHTML();
  }
  function applyWPTitle(wi, title) {
    if (!title) return;
    state.wps[wi].desc = title;
    const el = $('calc-wp-list');
    if (el) el.innerHTML = buildWPListHTML();
  }
  function syncWPs(n) {
    syncWPCount(n);
    const el = $('calc-wp-list');
    if (el) el.innerHTML = buildWPListHTML();
  }

  function addActivity(wi, type) {
    if ((type === 'mgmt' || type === 'meeting') && wi !== 0) return;
    const id = ++state.actCounter;
    const def = ACT_TYPES[type];
    const act = { id, type, label: def.label };
    const ps = getProjectStart() || new Date();
    const mo = getProjectMonths();

    if (def.mobility) {
      act.host = state.partners[0]?.id;
      act.pax = 2; act.days = 3; act.local_pax = 0; act.local_transport = 25;
      act.participants = {};
      state.partners.forEach(p => { if (p.id !== act.host) act.participants[p.id] = true; });
    } else if (type === 'me') {
      act.me_events = {};
      state.partners.forEach(p => { act.me_events[p.id] = { active:true, local_pax:20, intl_pax:0, local_rate:100, intl_rate:200 }; });
    } else if (type === 'local_ws') {
      act.ws_partners = {};
      state.partners.forEach(p => { act.ws_partners[p.id] = { active:true, ws_pax:10, ws_n:6, ws_cost:50 }; });
    } else if (type === 'campaign') {
      act.camp_partners = {};
      state.partners.forEach(p => { act.camp_partners[p.id] = { active:true, monthly:100, months:mo }; });
    } else if (['equipment','goods','consumables','website','artistic','other'].includes(type)) {
      act.note_partners = {};
      state.partners.forEach(p => {
        act.note_partners[p.id] = ACT_TYPES[type]?.depreciation ? { active:true, note:'', amount:0, project_pct:100, lifetime_pct:100 } : { active:true, note:'', amount:0 };
      });
    } else if (type === 'io') {
      act.io_partner_days = {}; act.io_partner_profiles = {};
      state.partners.forEach(p => { act.io_partner_days[p.id] = 40; });
    } else if (type === 'mgmt') {
      act.rate_applicant = 500; act.rate_partner = 250;
    }

    act.date_start = toISO(ps);
    act.date_end = toISO(addMonths(ps, Math.min(6, mo)));

    state.wps[wi].activities.push(act);
    const actContainer = $(`calc-wp-acts-${wi}`);
    if (actContainer) actContainer.insertAdjacentHTML('beforeend', buildActivityCard(act, wi));
    recalcWP(wi);
  }

  function removeAct(wi, actId) {
    state.wps[wi].activities = state.wps[wi].activities.filter(a => a.id !== actId);
    const el = $(`calc-act-${actId}`);
    if (el) el.remove();
    recalcWP(wi);
  }

  function setAct(wi, actId, field, value) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act) return;
    act[field] = isNaN(value) ? value : (parseFloat(value)||0);
    recalcWP(wi);
  }

  const SUBTYPE_DESC = {
    // Transnational Meetings
    'Kick-off meeting': 'This meeting marks the official start of the project and brings partners together to align on objectives, roles, and expectations. It is used to clarify the work plan, timeline, and communication methods. It helps create a shared understanding of the project from the beginning.',
    'Mid-term meeting': 'This meeting takes place during the implementation phase to review progress and assess the development of planned activities. Partners identify achievements, discuss challenges, and adjust the work plan if necessary. It helps maintain coordination and improve project quality.',
    'Final meeting': 'This meeting is held at the end of the project to review achievements, assess final results, and reflect on lessons learned. It also supports discussion on sustainability, follow-up actions, and future cooperation. It ensures proper closure and consolidation of outcomes.',
    'Coordination meeting': 'This meeting focuses on the day-to-day coordination of the project among partners. It is used to monitor activities, clarify responsibilities, and solve implementation issues. It supports smooth project management and effective internal communication.',
    'Technical working meeting': 'This meeting is dedicated to specific technical aspects of the project, such as developing outputs, tools, or methodologies. Partners work together on content, problem-solving, and practical decisions. It helps ensure consistency and technical quality across results.',
    'Strategic planning meeting': 'This meeting focuses on the long-term direction of the project and on strategic decisions for the consortium. Partners reflect on impact, sustainability, positioning, and future opportunities. It helps connect current work with broader project goals.',
    // LTTA / Mobility
    'Training mobility': 'This mobility activity is designed to provide participants with structured learning on a specific topic. It includes workshops, practical sessions, and collaborative learning experiences. It supports capacity building and the development of relevant skills and competences.',
    'Study visit mobility': 'This activity allows participants to visit organisations, initiatives, or projects related to the project theme. It focuses on learning from real practices and gaining inspiration from different contexts. It strengthens understanding through direct observation and exchange.',
    'Group mobility': 'This mobility brings together participants from different countries for a shared learning experience. It encourages collaboration, intercultural dialogue, and collective problem-solving. It helps strengthen group dynamics and European cooperation.',
    'Youth exchange mobility': 'This activity involves young participants from different countries in non-formal learning experiences. It combines workshops, group activities, and intercultural exchange. It promotes participation, mutual understanding, and the development of key competences.',
    'Staff mobility': 'This mobility is aimed at professionals or staff members involved in the project. It focuses on exchange of practices, professional development, and organisational learning. It strengthens the skills of staff and improves cooperation between organisations.',
    'Job shadowing mobility': 'This activity allows participants to observe the daily work of a host organisation. It focuses on learning through observation, dialogue, and exchange with professionals. It supports knowledge transfer and helps participants understand practical working methods.',
    'Peer learning mobility': 'This mobility is based on the exchange of knowledge, experiences, and practices among participants. It promotes horizontal learning and mutual support between peers. It helps generate collective knowledge and encourages collaborative reflection.',
    'Blended mobility': 'This activity combines online and face-to-face components to strengthen the learning process. Participants take part in preparatory or follow-up activities in addition to the physical mobility. It supports continuity, flexibility, and deeper engagement.',
    'Pilot mobility': 'This mobility is designed to test and validate tools, methods, or approaches developed within the project. Participants take part in structured activities that help assess effectiveness and collect feedback. It supports innovation and practical improvement of results.',
    'Volunteering mobility': 'This activity involves participants in community-based actions that combine learning and service. It promotes solidarity, engagement, and active citizenship through practical contribution. It connects personal development with social or community impact.',
    'Expert mobility': 'This mobility involves the participation of experts who contribute specialised knowledge to the project. Experts may provide training, mentoring, advice, or validation. It enhances the quality of activities and supports more advanced learning outcomes.',
    'Community immersion mobility': 'This activity allows participants to engage directly with a local community or context. Learning takes place through participation, interaction, and real-life experience. It helps participants better understand social, cultural, or environmental realities.',
    // Intellectual Outputs
    'Educational manual': 'This output is a structured educational resource designed to support learning and practice on a specific topic. It usually combines concepts, activities, and practical guidance. It helps transfer knowledge in a clear and usable way.',
    'Methodological guide': 'This output presents a method, approach, or process that can be applied by organisations, educators, or practitioners. It explains how to implement a specific methodology step by step. It supports replication and quality in project activities.',
    'Training course / module': 'This output consists of a structured learning programme or unit focused on a specific topic or competence area. It may include sessions, activities, and learning materials. It is designed to support training delivery and participant development.',
    'Toolkit': 'This output is a practical collection of tools, templates, resources, or activities that users can apply directly. It is usually action-oriented and easy to use in different contexts. It supports implementation and hands-on work.',
    'Research report / needs analysis': 'This output gathers evidence, findings, or analysis related to the project topic or target groups. It helps identify needs, challenges, and opportunities that justify the project approach. It provides a knowledge base for decision-making and design.',
    'Digital platform / interactive tool': 'This output is a digital resource created to support learning, participation, access to materials, or project interaction. It may include online tools, interactive content, or user-based features. It helps extend the project\'s usability and reach.',
    // Multiplier Events
    'Launch event': 'This event is organised to introduce the project, its aims, and its expected results to relevant audiences. It helps create visibility and attract early interest from stakeholders and participants. It is useful for setting the public starting point of the project.',
    'Dissemination conference': 'This event is designed to present project activities, findings, or outputs to a wider audience. It supports visibility, stakeholder engagement, and knowledge sharing. It helps disseminate results in a structured and professional format.',
    'Final conference': 'This event takes place towards the end of the project to showcase achievements, results, and impact. It allows partners to present final outputs and share lessons learned. It also supports sustainability and future uptake of project outcomes.',
    'Stakeholder event': 'This event brings together relevant actors connected to the project theme, such as institutions, professionals, community groups, or decision-makers. It creates space for dialogue, feedback, and collaboration. It helps strengthen relevance and external engagement.',
    'Networking event': 'This event is designed to connect participants, organisations, and stakeholders interested in the project topic. It supports partnership building, exchange of contacts, and future cooperation. It helps expand the project\'s ecosystem and visibility.',
    'Public presentation event': 'This event focuses on presenting a project result, process, or achievement to a broader audience. It can be used to explain the value of the project and encourage interest or participation. It supports communication, transparency, and outreach.',
    // Local Workshops
    'Training workshop': 'This workshop is designed to develop specific knowledge, skills, or competences among participants. It includes practical activities, guided learning, and interaction. It helps build capacity at local level in relation to the project theme.',
    'Participatory workshop': 'This workshop is based on active involvement, dialogue, and contribution from participants. It encourages people to share ideas, experiences, and reflections in a collaborative setting. It supports inclusion and collective learning.',
    'Awareness workshop': 'This workshop aims to raise understanding and sensitivity around a specific topic or social challenge. It introduces key concepts and encourages reflection and discussion. It helps engage participants and increase interest in the issue addressed.',
    'Co-creation workshop': 'This workshop is designed to generate ideas, materials, or solutions collaboratively with participants. It supports joint creation and active contribution to the project process. It is useful for developing outputs, activities, or community-based responses.',
    'Community workshop': 'This workshop involves local participants and focuses on issues relevant to a specific community or territory. It encourages local engagement, shared reflection, and practical participation. It helps connect the project with real local contexts and needs.',
    'Testing / pilot workshop': 'This workshop is used to test an activity, tool, or methodology before finalising it. Participants provide feedback through direct experience and reflection. It helps improve quality and validate project results in practice.',
    // Dissemination
    'Social media dissemination': 'This type of dissemination uses social media channels to share project activities, results, and messages with wider audiences. It supports visibility, engagement, and regular communication in accessible formats. It is especially useful for reaching diverse and online-based audiences.',
    'Newsletter dissemination': 'This type of dissemination uses newsletters to provide updates on project progress, results, and upcoming actions. It helps maintain communication with interested audiences over time. It is useful for structured and recurring outreach.',
    'Press / media dissemination': 'This type of dissemination uses newspapers, magazines, radio, digital press, or other media channels to increase project visibility. It helps reach audiences beyond the project\'s direct network. It supports public awareness and external recognition.',
    'Video dissemination': 'This type of dissemination uses video content to explain, present, or promote project activities and results. It is useful for storytelling, visibility, and accessible communication. It helps make the project more attractive and easier to understand.',
    'Community / stakeholder dissemination': 'This type of dissemination focuses on sharing project information with local communities, organisations, institutions, or relevant stakeholders. It helps build connections, encourage participation, and strengthen local relevance. It supports meaningful outreach beyond online promotion.',
    'Printed dissemination': 'This type of dissemination uses physical materials such as brochures, posters, flyers, or other printed resources. It is useful in events, community spaces, and face-to-face activities. It supports visibility in contexts where physical communication is important.',
    // Website
    'Project website': 'This website serves as the main online space for the project. It presents key information, objectives, activities, and updates in one accessible place. It supports visibility, transparency, and public communication.',
    'Landing page': 'This type of web page is designed to present a specific message, activity, or call to action in a clear and focused way. It is usually simple, direct, and visually targeted. It helps attract attention and guide users quickly.',
    'Resource website': 'This website is designed to host and share project materials, publications, and practical resources. It helps users easily access and download outputs. It supports usability, dissemination, and long-term access to results.',
    'Learning platform': 'This website provides a digital space for training, learning content, or educational interaction. It may include modules, materials, exercises, or user access areas. It supports structured learning processes within the project.',
    'Community platform': 'This website is designed to connect participants, partners, or users through interaction and shared content. It may include forums, profiles, internal communication, or collaborative tools. It supports engagement and continuity beyond single activities.',
    'Results repository': 'This website is focused on collecting, organising, and presenting the main outputs and results of the project. It helps ensure that outcomes remain accessible after project completion. It supports sustainability and exploitation of results.',
    // Artistic Fees
    'Graphic design': 'This service covers the visual design of materials such as brochures, reports, presentations, or communication assets. It helps create a professional and coherent visual identity for the project. It supports clarity, attractiveness, and visibility.',
    'Video production / editing': 'This service involves the creation or editing of video materials related to the project. It may include interviews, promotional videos, documentation, or educational content. It helps communicate results in an engaging and accessible format.',
    'Photography': 'This service covers the professional documentation of project activities through photographs. It helps capture key moments, support dissemination, and create visual records. It is useful for communication, reporting, and visibility.',
    'Illustration / branding': 'This service focuses on custom illustrations, visual concepts, or brand elements for the project. It helps give the project a distinctive and attractive identity. It supports communication and recognition across materials and outputs.',
    'Audio / podcast production': 'This service includes the recording, editing, or production of audio content such as podcasts, voice materials, or sound-based resources. It supports communication and educational outreach in audio format. It is useful for accessible and flexible dissemination.',
    'Artistic facilitation / performance': 'This service involves artistic contributions to workshops, events, or learning activities through performance or creative facilitation. It helps make activities more participatory, expressive, and engaging. It supports artistic and experiential dimensions of the project.',
    // Equipment
    'Computers / laptops': 'This equipment includes computers or laptops needed to support project management, content development, training, or digital work. It is useful when activities require regular technical access. It helps ensure smooth implementation of project tasks.',
    'Tablets / mobile devices': 'This equipment includes portable digital devices used for participation, learning, data collection, or communication. It is useful in activities requiring flexibility and mobility. It supports access and interaction in dynamic settings.',
    'Audio-visual equipment': 'This equipment includes tools such as projectors, screens, speakers, or related devices used in training, events, or presentations. It supports visibility and effective delivery of activities. It is important for communication and group-based learning.',
    'Recording equipment': 'This equipment includes microphones, cameras, or recording devices used to document activities or create project content. It is useful for producing materials and capturing evidence. It supports dissemination, reporting, and content creation.',
    'Educational / workshop equipment': 'This equipment includes tools or materials needed to run workshops, learning activities, or practical sessions. It may vary depending on the topic and methodology of the project. It supports participation and effective delivery of activities.',
    'Event technical equipment': 'This equipment includes technical resources needed for public events, presentations, or conferences. It may involve sound, projection, lighting, or related support devices. It helps ensure professional and functional event implementation.',
    // Other Goods
    'Printed materials': 'These goods include brochures, handouts, manuals, posters, or other printed resources used in the project. They support communication, training, and dissemination. They are especially useful in face-to-face contexts and public activities.',
    'Educational materials': 'These goods include physical resources used to support learning and training activities. They may include manuals, cards, kits, or teaching aids. They help make educational processes more practical and accessible.',
    'Visibility materials': 'These goods include branded or visual items used to increase recognition of the project. They may include banners, roll-ups, posters, or similar elements. They support public visibility and communication at events and activities.',
    'Workshop materials': 'These goods include physical items needed to carry out workshop activities effectively. They may include stationery, practical materials, or activity-specific resources. They support implementation and participant engagement.',
    'Event materials': 'These goods include resources needed for conferences, meetings, or public events. They may include signage, folders, participant packs, or visual supports. They help organise activities and improve the participant experience.',
    'Participant kits / welcome packs': 'These goods include sets of materials prepared for participants at the beginning of an activity or event. They may contain practical, informative, or branded resources. They help participants feel welcomed and better prepared.',
    // Consumables
    'Printing consumables': 'These consumables include paper, ink, toner, or other items needed for printing project materials. They support the preparation of resources, handouts, and communication assets. They are often used in administration, workshops, and dissemination.',
    'Workshop consumables': 'These consumables include materials used up during practical activities, training sessions, or group work. They may include paper, markers, cards, or other disposable resources. They support dynamic and participatory implementation.',
    'Office consumables': 'These consumables include everyday materials needed for project administration and coordination. They may include pens, folders, paper, or similar supplies. They support the practical running of project work.',
    'Hygiene / cleaning consumables': 'These consumables include cleaning and hygiene supplies used during meetings, workshops, or events. They help maintain safe and appropriate conditions for participants. They are especially relevant in shared spaces and group activities.',
    'Catering consumables': 'These consumables include food-related disposable items used during meetings, workshops, or events. They may include cups, plates, napkins, or similar materials. They support participant comfort and activity logistics.',
    'Technical consumables': 'These consumables include small technical items used during project implementation, such as batteries, cables, or storage media. They support the functioning of equipment and technical activities. They are useful in training, events, and production work.',
    // Other Costs
    'Translation / interpretation costs': 'These costs cover language support needed to make project activities and results accessible to different audiences. They may include written translation or live interpretation. They support inclusion, multilingual communication, and international cooperation.',
    'External expert / trainer costs': 'These costs cover the contribution of external professionals who provide specialised knowledge or training. They help strengthen the quality and relevance of project activities. They are useful when specific expertise is needed.',
    'Venue / space rental costs': 'These costs cover the rental of spaces used for meetings, workshops, training, or public events. They help provide an appropriate setting for project implementation. They are relevant when partner organisations do not have suitable spaces available.',
    'Hosting / software / platform costs': 'These costs cover digital services needed to run websites, online tools, subscriptions, or project platforms. They support communication, learning, content sharing, and project management. They are important for digital or hybrid activities.',
    'Travel / accommodation support costs': 'These costs cover additional support related to participant mobility, especially when specific travel or stay arrangements are needed. They help ensure participation and smooth organisation of activities. They may be particularly relevant in inclusive or international contexts.',
    'Evaluation / administrative support costs': 'These costs cover external or additional support for evaluation, reporting, documentation, or administrative tasks. They help strengthen quality assurance and project management. They are useful when specific technical or organisational support is needed.',
  };

  function setActSubtype(wi, actId, subtype) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act) return;
    act.subtype = subtype;
    if (subtype) {
      act.label = subtype;
      // Auto-fill description with base text if empty or was auto-generated
      const baseDesc = SUBTYPE_DESC[subtype] || '';
      if (baseDesc && (!act.desc || act._autoDesc)) {
        act.desc = baseDesc;
        act._autoDesc = true; // flag to know it was auto-generated
      }
    }
    // Re-render
    const container = getRouteContainer()?.closest('#intake-calc-container') || $('calc-root');
    if (container) renderMergedWPs(container);
  }

  function setActDesc(wi, actId, value) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act) return;
    act.desc = value;
    act._autoDesc = false; // user edited, don't overwrite on subtype change
  }

  function setActHost(wi, actId, value) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act) return;
    act.host = value;
    act.participants = {};
    state.partners.forEach(p => { if (p.id !== act.host) act.participants[p.id] = true; });
    const el = $('calc-act-fields-' + actId);
    if (el) el.innerHTML = buildActFields(act, wi);
    recalcWP(wi);
  }

  function setParticipant(wi, actId, pid, active) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act) return;
    if (!act.participants) act.participants = {};
    act.participants[pid] = active;
    const el = $('calc-act-fields-' + actId);
    if (el) el.innerHTML = buildActFields(act, wi);
    recalcWP(wi);
  }

  function setIOStaff(wi, actId, pid, si, field, value) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act || !act.io_staff || !act.io_staff[pid]) return;
    const s = act.io_staff[pid].staff[si];
    if (!s) return;
    if (field === 'days') s.days = parseFloat(value) || 0;
    else if (field === 'profileId') s.profileId = value ? parseInt(value) : null;
    else s[field] = value;
    const el = $('calc-act-fields-' + actId);
    if (el) el.innerHTML = buildIOFields(act, wi);
    recalcWP(wi);
  }
  function addIOStaff(wi, actId, pid) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act || !act.io_staff || !act.io_staff[pid]) return;
    act.io_staff[pid].staff.push({ profileId: null, days: 10, tasks: '' });
    const el = $('calc-act-fields-' + actId);
    if (el) el.innerHTML = buildIOFields(act, wi);
  }
  function removeIOStaff(wi, actId, pid, si) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act || !act.io_staff || !act.io_staff[pid]) return;
    act.io_staff[pid].staff.splice(si, 1);
    const el = $('calc-act-fields-' + actId);
    if (el) el.innerHTML = buildIOFields(act, wi);
    recalcWP(wi);
  }
  function setIOPartnerActive(wi, actId, pid, active) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act || !act.io_staff) return;
    if (!act.io_staff[pid]) act.io_staff[pid] = { active: true, staff: [{ profileId: null, days: 20, tasks: '' }] };
    act.io_staff[pid].active = active;
    const el = $('calc-act-fields-' + actId);
    if (el) el.innerHTML = buildIOFields(act, wi);
    recalcWP(wi);
  }
  // Legacy compatibility
  function setIODays(wi, actId, pid, value) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act) return;
    if (!act.io_partner_days) act.io_partner_days = {};
    act.io_partner_days[pid] = parseFloat(value)||0;
    recalcWP(wi);
  }
  function setIOProfile(wi, actId, pid, value) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act) return;
    if (!act.io_partner_profiles) act.io_partner_profiles = {};
    act.io_partner_profiles[pid] = value ? parseInt(value) : null;
    const el = $('calc-act-fields-' + actId);
    if (el) el.innerHTML = buildActFields(act, wi);
    recalcWP(wi);
  }

  function setME(wi, actId, pid, field, value) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act || !act.me_events) return;
    if (!act.me_events[pid]) act.me_events[pid] = { active:true, local_pax:20, intl_pax:0, local_rate:100, intl_rate:200 };
    if (field === 'active') {
      act.me_events[pid].active = value;
      const el = $('calc-act-fields-' + actId);
      if (el) el.innerHTML = buildActFields(act, wi);
    } else {
      act.me_events[pid][field] = parseFloat(value)||0;
    }
    recalcWP(wi);
  }

  function setPartnerDetail(wi, actId, stateKey, pid, field, value) {
    const act = state.wps[wi].activities.find(a => a.id === actId);
    if (!act || !act[stateKey]) return;
    if (field === 'active') {
      act[stateKey][pid][field] = value;
      const el = $('calc-act-fields-' + actId);
      if (el) el.innerHTML = buildActFields(act, wi);
    } else {
      act[stateKey][pid][field] = ['note'].includes(field) ? value : (parseFloat(value)||0);
    }
    recalcWP(wi);
  }

  function toggleWP(wi) { $(`calc-wp-${wi}`)?.classList.toggle('open'); }

  function switchResTab(name) {
    document.querySelectorAll('.calc-res-tab').forEach(t => t.classList.remove('active'));
    ['summary','wp','partner'].forEach(n => { const el = $('calc-res-'+n); if (el) el.style.display = 'none'; });
    document.querySelector(`.calc-res-tab:nth-child(${name==='summary'?1:name==='wp'?2:3})`).classList.add('active');
    const el = $('calc-res-'+name);
    if (el) el.style.display = 'block';
  }

  function setGanttView(mode) { ganttView = mode; renderGantt(getRouteContainer()); }
  function ganttToggle(wi) { ganttCollapsed[wi] = !ganttCollapsed[wi]; buildGanttChart(); }
  function ganttCollapseAll() { state.wps.forEach((_,wi) => ganttCollapsed[wi]=true); buildGanttChart(); }
  function ganttExpandAll() { state.wps.forEach((_,wi) => ganttCollapsed[wi]=false); buildGanttChart(); }

  function backToSelector() {
    currentProjectId = null;
    currentStep = -1;
    maxReached = -1;
    state = { project:null, partners:[], partnerRates:{}, workerRates:[], wrCounter:0, routes:{}, extraDests:[], extraDestCounter:0, wps:[], actCounter:0, mgmt:{rate_applicant:500,rate_partner:250} };
    renderProjectSelector();
  }

  /* ══════════════════════════════════════════════════════════════
     LIBRARY API — used by Intake to embed calculator steps
     ══════════════════════════════════════════════════════════════ */

  let _embeddedMode = false;
  let _navCallback = null;

  /**
   * Initialize Calculator state from Intake data, without rendering the shell/selector.
   * @param {Object} projectData - project object {id, name, type, start_date, duration_months, eu_grant, cofin_pct, indirect_pct}
   * @param {Array} partnerList - array of partner objects [{id, name, city, country, order_index, role}]
   */
  function initFromIntake(projectData, partnerList) {
    _embeddedMode = true;
    currentProjectId = projectData.id;
    state.project = projectData;
    state.partners = (partnerList || []).sort((a, b) => a.order_index - b.order_index);

    // Init rates from partner countries
    state.partnerRates = {};
    state.workerRates = [];
    state.wrCounter = 0;
    state.partners.forEach(p => {
      state.partnerRates[p.id] = getPerdiemRef(p.country);
      const ref = getOfficialRate(p.country);
      PROFILES.forEach(prof => {
        state.workerRates.push({ id: ++state.wrCounter, pid: p.id, category: prof.label, rate: ref[prof.field] || 140 });
      });
    });

    // Init routes
    state.routes = {};
    for (let i = 0; i < state.partners.length; i++)
      for (let j = i + 1; j < state.partners.length; j++)
        state.routes[routeKey(state.partners[i].id, state.partners[j].id)] = { km: 0, green: false, custom_rate: null };

    // Init WPs (4 default)
    state.wps = [];
    state.actCounter = 0;
    syncWPCount(4);

    maxReached = 0;
    console.log('[Calc] initFromIntake done —', state.partners.length, 'partners');
  }

  /** Set a callback for navigation buttons instead of Calculator._goTo */
  function setNavCallback(fn) { _navCallback = fn; }

  /** Build nav buttons that call the nav callback if set, or Calculator._goTo */
  function embeddedNavButtons(prevStep, nextStep, nextLabel) {
    const navFn = _navCallback ? 'Intake._calcNav' : 'Calculator._goTo';
    return `<div class="flex justify-between mt-6">
      ${prevStep !== null ? `<button onclick="${navFn}(${prevStep})" class="px-4 py-2 text-sm font-semibold text-on-surface-variant hover:text-on-surface border border-outline-variant rounded-lg transition-colors">\u2190 Back</button>` : '<span></span>'}
      ${nextStep !== null ? `<button onclick="${navFn}(${nextStep})" class="px-5 py-2.5 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-container transition-colors">${nextLabel || 'Next \u2192'}</button>` : ''}
    </div>`;
  }

  /** Render Rates step into a container (for Intake embedding) */
  function renderRatesInto(container) { renderRates(container); }

  /** Render Routes step into a container */
  function renderRoutesInto(container) { renderRoutes(container); }

  /** Render merged WP + Activities into a single step */
  function renderMergedWPs(container) {
    // Ensure WP1 has mgmt
    if (state.wps[0] && state.wps[0].activities.length === 0) {
      state.wps[0].activities.push({
        id: ++state.actCounter, type: 'mgmt', label: 'Project Management',
        rate_applicant: 500, rate_partner: 250,
        date_start: toISO(getProjectStart()), date_end: toISO(addMonths(getProjectStart() || new Date(), getProjectMonths()))
      });
    }

    const directTotal = state.wps.reduce((s, wp) => s + wp.activities.reduce((ss, a) => ss + calcActivity(a).total, 0), 0);
    const { total } = applyIndirectCosts(directTotal);
    const { totalProject } = getFinancials();
    const usePct = totalProject > 0 ? Math.min(total / totalProject * 100, 100).toFixed(1) : 0;

    const nav = _embeddedMode ? embeddedNavButtons(3, 5, 'Presupuesto \u2192') : navButtons(1, 3, 'Activities \u2192');

    container.innerHTML = `
      <h2 class="font-headline text-lg font-bold mb-1">Work Packages & Activities</h2>
      <p class="text-sm text-on-surface-variant mb-4">Define WPs and add activities to each one. 4 WPs pre-loaded.</p>

      <!-- WP count -->
      <div class="flex items-center gap-3 mb-4">
        <label class="text-sm font-semibold text-on-surface-variant">Number of WPs</label>
        <input type="number" id="calc-n-wps" value="${state.wps.length}" min="1" max="12" class="w-20 px-2 py-1.5 text-sm border border-outline-variant/30 rounded-lg text-center font-bold" onchange="Calculator._syncWPsMerged(parseInt(this.value))">
      </div>

      <!-- Summary bar -->
      <div class="bg-primary text-white rounded-xl p-4 mb-5 flex items-center gap-5 flex-wrap">
        <div class="flex-1 min-w-[120px]">
          <div class="text-[10px] uppercase tracking-wider opacity-50 mb-1">Total calculated</div>
          <div class="font-headline text-2xl font-bold" id="calc-live-total">${euros(total)}</div>
        </div>
        <div class="min-w-[90px]">
          <div class="text-[10px] uppercase tracking-wider opacity-50 mb-1">Target</div>
          <div class="text-sm font-mono">${euros(totalProject)}</div>
        </div>
        <div class="min-w-[90px]">
          <div class="text-[10px] uppercase tracking-wider opacity-50 mb-1">Difference</div>
          <div class="text-sm font-mono" id="calc-live-diff">${euros(totalProject - total)}</div>
        </div>
        <div class="flex-[2] min-w-[150px]">
          <div class="text-[10px] opacity-40 mb-1">Budget usage</div>
          <div class="h-1.5 rounded bg-white/20 overflow-hidden">
            <div class="h-full rounded bg-white transition-all" id="calc-live-bar" style="width:${usePct}%"></div>
          </div>
        </div>
      </div>

      <div id="calc-wps-container">
        ${state.wps.map((wp, wi) => buildWPSection(wp, wi)).join('')}
      </div>

      ${nav}
    `;

    // Calculate all
    state.wps.forEach((_, wi) => recalcWP(wi));
  }

  /** Render Results step into a container */
  function renderResultsInto(container) { renderResults(container); }

  /** Render Gantt step into a container */
  function renderGanttInto(container) { renderGantt(container); }

  /** Get current state for Intake summary */
  function getCalcState() {
    const directCosts = state.wps.reduce((s, wp) => s + wp.activities.reduce((ss, a) => ss + calcActivity(a).total, 0), 0);
    const { indirectPct } = getFinancials();
    const { indirect, total } = applyIndirectCosts(directCosts);
    return {
      directCosts,
      indirect,
      indirectPct,
      total,
      wps: state.wps,
      partners: state.partners,
      financials: getFinancials(),
    };
  }

  /** Check if Calculator state is initialized */
  function isInitialized() { return state.project !== null; }

  /** Sync WPs and re-render merged view */
  function syncWPsMerged(n) {
    syncWPCount(n);
    const container = document.getElementById('intake-calc-container');
    if (container && _embeddedMode) renderMergedWPs(container);
  }

  /* ── Public API ─────────────────────────────────────────────── */
  return {
    init,
    // Library API for Intake embedding
    initFromIntake,
    setNavCallback,
    renderRatesInto,
    renderRoutesInto,
    renderMergedWPs,
    renderResultsInto,
    renderGanttInto,
    getCalcState,
    isInitialized,
    // Exposed for onclick handlers (prefixed with _ to signal internal use)
    _loadProject: loadProject,
    _backToSelector: backToSelector,
    _goTo: goToStep,
    _setPerdiem: setPerdiem,
    _setWorkerRate: setWorkerRate,
    _addWorkerRate: addWorkerRate,
    _removeWorkerRate: removeWorkerRate,
    _setRouteBand: setRouteBand,
    _setRoute: setRoute,
    _addExtraDest: addExtraDest,
    _removeExtraDest: removeExtraDest,
    _setExtraDest: setExtraDest,
    _setWP: setWP,
    _setWPCat: setWPCat,
    _applyWPTitle: applyWPTitle,
    _syncWPs: syncWPs,
    _syncWPsMerged: syncWPsMerged,
    _addActivity: addActivity,
    _removeAct: removeAct,
    _setAct: setAct,
    _setActSubtype: setActSubtype,
    _setActDesc: setActDesc,
    _setActHost: setActHost,
    _setParticipant: setParticipant,
    _setIOStaff: setIOStaff,
    _addIOStaff: addIOStaff,
    _removeIOStaff: removeIOStaff,
    _setIOPartnerActive: setIOPartnerActive,
    _setIODays: setIODays,
    _setIOProfile: setIOProfile,
    _setME: setME,
    _setPartnerDetail: setPartnerDetail,
    _toggleWP: toggleWP,
    _switchResTab: switchResTab,
    _setGanttView: setGanttView,
    _ganttToggle: ganttToggle,
    _ganttCollapseAll: ganttCollapseAll,
    _ganttExpandAll: ganttExpandAll,
  };
})();
