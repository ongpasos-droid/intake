/* ═══════════════════════════════════════════════════════════════
   Developer (Write) — 4-phase proposal writer
   Phase 1: Context  |  Phase 2: Generate  |  Phase 3: Edit  |  Phase 4: Review
   ═══════════════════════════════════════════════════════════════ */

const Developer = (() => {

  let currentProject = null;
  let currentInstance = null;
  let templateJson = null;
  let fieldValues = {};
  let flatSections = [];
  let activeFieldId = null;
  let phase = 0; // 0=list, 1=context, 2=generate, 3=edit, 4=review
  let contextData = null;
  let evalCriteria = [];
  let _saveTimer = null;
  let _typingTimer = null;

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function fmtDate(v) {
    if (!v) return '\u2014';
    const s = typeof v === 'string' ? v.slice(0, 10) : '';
    if (!s) return '\u2014';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  }
  function wordCount(text) { return text ? text.trim().split(/\s+/).filter(Boolean).length : 0; }

  /* ── Init ──────────────────────────────────────────────────── */
  function init() {
    phase = 0;
    loadProjects();
  }

  /* ── Phase 0: Project list ─────────────────────────────────── */
  async function loadProjects() {
    const el = document.getElementById('developer-content');
    if (!el) return;
    el.innerHTML = '<p class="text-sm text-on-surface-variant py-8 text-center">Cargando proyectos...</p>';

    try {
      const result = await API.get('/intake/projects');
      const all = Array.isArray(result) ? result : (result.data || result);
      const projects = (all || []).filter(p => p.status === 'writing' || p.status === 'evaluating');

      if (!projects.length) {
        el.innerHTML = `
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <span class="material-symbols-outlined text-5xl text-outline-variant/40 mb-4">draft</span>
            <h3 class="font-headline text-lg font-bold text-primary mb-2">No tienes proyectos listos para escribir</h3>
            <p class="text-sm text-on-surface-variant mb-6 max-w-sm">Completa el diseno de un proyecto en Intake y pulsa "Comenzar a escribir" para verlo aqui.</p>
            <button type="button" onclick="location.hash='create'"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all">
              <span class="material-symbols-outlined text-lg">add</span> Disenar proyecto
            </button>
          </div>`;
        return;
      }

      el.innerHTML = `
        <h1 class="font-headline text-2xl font-extrabold text-primary mb-2">Escribir propuesta</h1>
        <p class="text-sm text-on-surface-variant mb-6">Selecciona un proyecto para redactar su propuesta.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${projects.map(p => `
          <div class="dev-card bg-white rounded-2xl border-2 border-outline-variant/20 hover:border-purple-400 p-5 cursor-pointer transition-all hover:shadow-lg group" data-id="${esc(p.id)}">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <span class="material-symbols-outlined text-purple-600 text-xl">description</span>
              </div>
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded border bg-amber-100 text-amber-700 border-amber-200">${p.status === 'writing' ? 'Escribiendo' : 'Evaluando'}</span>
            </div>
            <h3 class="font-headline text-base font-bold text-on-surface mb-1 truncate group-hover:text-purple-700 transition-colors">${esc(p.name)}</h3>
            <p class="text-xs text-on-surface-variant mb-3">${esc(p.type || '')}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-on-surface-variant">${fmtDate(p.updated_at || p.created_at)}</span>
              <span class="inline-flex items-center gap-1 text-xs font-bold text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Escribir <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>
          </div>
        `).join('')}
        </div>`;

      el.querySelectorAll('.dev-card').forEach(card => {
        card.addEventListener('click', () => openProject(card.dataset.id));
      });
    } catch (err) {
      console.error('Developer.loadProjects:', err);
      el.innerHTML = '<p class="text-sm text-error py-8 text-center">Error al cargar proyectos</p>';
    }
  }

  /* ── Open project → Phase 1 ────────────────────────────────── */
  async function openProject(projectId) {
    const el = document.getElementById('developer-content');
    el.innerHTML = '<div class="flex items-center justify-center py-16"><div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>';

    try {
      // Load context + instance + values in parallel
      const [ctx, instance] = await Promise.all([
        API.get('/developer/projects/' + projectId + '/context'),
        API.post('/developer/projects/' + projectId + '/instance', {}),
      ]);

      contextData = ctx;
      currentProject = ctx.project;
      currentInstance = instance;

      // Parse template
      if (instance.template_json) {
        templateJson = typeof instance.template_json === 'string' ? JSON.parse(instance.template_json) : instance.template_json;
        flatSections = flattenSections(templateJson);
      }

      // TEST MODE: start blank — don't load saved values
      fieldValues = {};
      // Production: fieldValues = await API.get('/developer/instances/' + instance.id + '/values');

      // Load eval criteria
      try { evalCriteria = await API.get('/developer/eval-criteria'); } catch (e) { evalCriteria = []; }

      renderPhase1();
    } catch (err) {
      console.error('Developer.openProject:', err);
      el.innerHTML = '<p class="text-sm text-error py-8 text-center">Error al abrir proyecto: ' + esc(err.message || err) + '</p>';
    }
  }

  /* ── Flatten template sections into linear list ────────────── */
  function flattenSections(tmpl) {
    const flat = [];
    if (tmpl.project_summary) {
      flat.push({
        id: 'summary',
        fieldId: 'summary_text',
        number: '0',
        title: 'Project Summary',
        guidance: tmpl.project_summary.fields?.[0]?.guidance || '',
        parent: null,
      });
    }
    for (const sec of (tmpl.sections || [])) {
      // Collect all subsections — handle both direct subsections and subsections_groups
      const allSubs = [];
      if (sec.subsections) {
        for (const sub of sec.subsections) allSubs.push({ sub, parent: sec.title, parentNumber: sec.number });
      }
      if (sec.subsections_groups) {
        for (const group of sec.subsections_groups) {
          if (group.subsections) {
            for (const sub of group.subsections) allSubs.push({ sub, parent: sec.title + ' — ' + group.title, parentNumber: group.number });
          }
        }
      }
      for (const { sub, parent, parentNumber } of allSubs) {
        for (const field of (sub.fields || [])) {
          if (field.type === 'textarea' || field.type === 'table') {
            flat.push({
              id: sub.id,
              fieldId: field.id,
              number: sub.number,
              title: sub.title,
              guidance: (sub.guidance || []).join('\n'),
              parent,
              parentNumber,
            });
          }
        }
      }
    }
    return flat;
  }

  /* ── Phase tabs ────────────────────────────────────────────── */
  function renderPhaseTabs(active) {
    const tabs = [
      { id: 1, label: 'Contexto', icon: 'checklist' },
      { id: 15, label: 'Prep Studio', icon: 'psychology' },
      { id: 2, label: 'Generar', icon: 'auto_awesome' },
      { id: 3, label: 'Editar', icon: 'edit_note' },
      { id: 4, label: 'Revisar', icon: 'fact_check' },
    ];
    return `
      <div class="flex items-center gap-1 mb-6 border-b border-outline-variant/30 pb-3">
        <button onclick="Developer._back()" class="mr-2 text-on-surface-variant hover:text-primary transition-colors" title="Volver a proyectos">
          <span class="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <span class="font-headline text-sm font-bold text-primary mr-4 truncate max-w-[200px]">${esc(currentProject?.name)}</span>
        ${tabs.map(t => `
          <button onclick="Developer._phase(${t.id})" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${active === t.id ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:bg-surface-container-low'}">
            <span class="material-symbols-outlined text-sm">${t.icon}</span> ${t.label}
          </button>
        `).join('')}
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     PHASE 1: Context Checklist
     ══════════════════════════════════════════════════════════════ */
  function renderPhase1() {
    phase = 1;
    const el = document.getElementById('developer-content');
    const ctx = contextData;
    const p = ctx.project;

    const checks = [
      { label: 'Datos del proyecto', detail: `${esc(p.name)} \u00B7 ${esc(p.type)} \u00B7 ${p.duration_months || 24} meses`, ok: !!p.name },
      { label: 'Consorcio', detail: `${ctx.partners.length} socios`, ok: ctx.partners.length >= 2 },
      { label: 'Work Packages', detail: `${ctx.wps.length} WPs, ${ctx.wps.reduce((s, w) => s + (w.activities?.length || 0), 0)} actividades`, ok: ctx.wps.length >= 2 },
      { label: 'Contexto (problema, enfoque)', detail: ctx.context ? `${wordCount(ctx.context.problem)} + ${wordCount(ctx.context.approach)} palabras` : 'Sin rellenar', ok: !!(ctx.context?.problem && ctx.context?.approach) },
      { label: 'Plantilla del formulario', detail: templateJson ? esc(templateJson.meta?.title?.substring(0, 60)) : 'No encontrada', ok: !!templateJson },
      { label: 'Criterios de evaluacion', detail: evalCriteria.length ? `${evalCriteria.length} secciones` : 'Opcional — se usaran los del formulario', ok: true },
    ];

    const canGenerate = !!(p.name && ctx.partners.length >= 2 && ctx.wps.length >= 1 && templateJson);

    el.innerHTML = renderPhaseTabs(1) + `
      <div class="max-w-3xl">
        <h2 class="font-headline text-xl font-bold mb-1">Contexto del proyecto</h2>
        <p class="text-sm text-on-surface-variant mb-6">Verifica que toda la informacion esta disponible antes de generar el borrador.</p>

        <div class="space-y-3 mb-8">
          ${checks.map(c => `
            <div class="flex items-center gap-4 p-4 rounded-xl border ${c.ok ? 'border-green-200 bg-green-50/50' : 'border-amber-200 bg-amber-50/50'}">
              <span class="material-symbols-outlined text-xl ${c.ok ? 'text-green-600' : 'text-amber-500'}">${c.ok ? 'check_circle' : 'warning'}</span>
              <div class="flex-1">
                <div class="text-sm font-bold text-on-surface">${c.label}</div>
                <div class="text-xs text-on-surface-variant">${c.detail}</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Partners list -->
        <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 mb-6">
          <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">Consorcio</h3>
          ${ctx.partners.map((pt, i) => `
            <div class="flex items-center gap-2 py-1.5 text-sm ${i < ctx.partners.length - 1 ? 'border-b border-outline-variant/10' : ''}">
              <span class="w-5 h-5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-outline-variant/30'} text-white text-[9px] font-bold flex items-center justify-center">${i + 1}</span>
              <span class="font-medium">${esc(pt.name)}</span>
              <span class="text-on-surface-variant text-xs">${[pt.city, pt.country].filter(Boolean).join(', ')}</span>
              ${i === 0 ? '<span class="text-[9px] font-bold uppercase text-primary bg-primary/10 px-1.5 py-0.5 rounded">Coord.</span>' : ''}
            </div>
          `).join('')}
        </div>

        <!-- WPs summary -->
        <div class="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-5 mb-8">
          <h3 class="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">Work Packages</h3>
          ${ctx.wps.map((wp, i) => `
            <div class="flex items-center gap-2 py-1.5 text-sm ${i < ctx.wps.length - 1 ? 'border-b border-outline-variant/10' : ''}">
              <span class="w-6 h-6 rounded bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center">${wp.code}</span>
              <span class="font-medium flex-1">${esc(wp.title)}</span>
              <span class="text-xs text-on-surface-variant">${wp.activities?.length || 0} act.</span>
            </div>
          `).join('')}
        </div>

        <div class="flex justify-center">
          <button onclick="Developer._phase(15)" class="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#1b1464] text-[#e7eb00] font-bold text-base shadow-[0_24px_48px_rgba(27,20,100,0.2)] hover:scale-[1.03] hover:shadow-[0_28px_56px_rgba(27,20,100,0.3)] active:scale-95 transition-all ${canGenerate ? '' : 'opacity-40 pointer-events-none'}">
            <span class="material-symbols-outlined text-2xl">psychology</span> Preparar propuesta
          </button>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     PHASE 1.5: Prep Studio
     ══════════════════════════════════════════════════════════════ */
  async function renderPrepStudio() {
    phase = 15;
    const el = document.getElementById('developer-content');
    const pid = currentProject.id;

    el.innerHTML = renderPhaseTabs(15) + '<div class="text-center py-8"><div class="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div><p class="text-sm text-on-surface-variant mt-2">Cargando Prep Studio...</p></div>';

    // Load data in parallel
    const [interview, docs, gaps] = await Promise.all([
      API.get('/developer/projects/' + pid + '/interview').catch(() => []),
      API.get('/developer/projects/' + pid + '/research-docs').catch(() => []),
      API.get('/developer/projects/' + pid + '/gap-analysis').catch(() => ({ gaps: [], strengths: [], stats: {} })),
    ]);

    const s = gaps.stats || {};
    const totalReady = (gaps.strengths?.length || 0);
    const totalGaps = (gaps.gaps?.length || 0);

    el.innerHTML = renderPhaseTabs(15) + `
      <div class="max-w-4xl">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-12 h-12 rounded-xl bg-[#1b1464]/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl text-[#1b1464]">psychology</span>
          </div>
          <div>
            <h2 class="font-headline text-xl font-bold">Prep Studio</h2>
            <p class="text-sm text-on-surface-variant">Prepara el material para que la IA escriba una propuesta de calidad</p>
          </div>
        </div>

        <!-- Gap Analysis Summary -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <div class="font-headline text-lg font-extrabold text-green-600">${totalReady}</div>
            <div class="text-[9px] uppercase tracking-wider text-green-700 font-bold">Puntos fuertes</div>
          </div>
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <div class="font-headline text-lg font-extrabold text-amber-600">${totalGaps}</div>
            <div class="text-[9px] uppercase tracking-wider text-amber-700 font-bold">Gaps a cubrir</div>
          </div>
          <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <div class="font-headline text-lg font-extrabold text-blue-600">${docs.length || 0}</div>
            <div class="text-[9px] uppercase tracking-wider text-blue-700 font-bold">Docs subidos</div>
          </div>
          <div class="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <div class="font-headline text-lg font-extrabold text-purple-600">${interview.filter(i => i.answer_text).length}/${interview.length || 0}</div>
            <div class="text-[9px] uppercase tracking-wider text-purple-700 font-bold">Entrevista</div>
          </div>
        </div>

        <!-- Block A: Research Documents -->
        <div class="bg-white rounded-2xl border border-outline-variant/20 p-6 mb-6">
          <h3 class="font-headline text-base font-bold text-primary mb-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">upload_file</span> A. Documentos de investigacion
          </h3>
          <p class="text-xs text-on-surface-variant mb-4">Sube informes, estudios o articulos sobre tu tematica. Se vectorizan y la IA los usara como evidencia prioritaria.</p>

          <!-- Upload -->
          <div class="flex items-center gap-3 mb-4">
            <label class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#1b1464] text-[#e7eb00] cursor-pointer hover:bg-[#1b1464]/90 transition-colors">
              <span class="material-symbols-outlined text-sm">add</span> Subir documento
              <input type="file" accept=".pdf,.docx,.txt" class="hidden" id="prep-doc-upload">
            </label>
            <span class="text-xs text-on-surface-variant">PDF, DOCX o TXT (max 30MB)</span>
          </div>

          <!-- Doc list -->
          <div id="prep-docs-list">
            ${(docs || []).length ? docs.map(d => `
              <div class="flex items-center gap-3 py-2 border-b border-outline-variant/10">
                <span class="material-symbols-outlined text-lg text-primary/50">description</span>
                <span class="text-sm font-medium flex-1">${esc(d.title || d.label)}</span>
                <span class="text-xs text-on-surface-variant">${d.file_type} · ${((d.file_size_bytes || 0) / 1024).toFixed(0)}KB</span>
                <button onclick="Developer._deleteDoc(${d.document_id})" class="text-on-surface-variant/30 hover:text-error"><span class="material-symbols-outlined text-sm">delete</span></button>
              </div>
            `).join('') : '<p class="text-xs text-on-surface-variant/50 italic py-2">Ningun documento subido aun.</p>'}
          </div>
        </div>

        <!-- Block B: Interview -->
        <div class="bg-white rounded-2xl border border-outline-variant/20 p-6 mb-6">
          <h3 class="font-headline text-base font-bold text-primary mb-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">chat</span> B. Entrevista al coordinador
          </h3>
          <p class="text-xs text-on-surface-variant mb-4">La IA te hara preguntas especificas sobre tu proyecto. Tus respuestas son el material mas valioso para escribir una propuesta autentica.</p>

          ${interview.length === 0 ? `
            <button onclick="Developer._genInterview()" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-[#1b1464] text-[#e7eb00] hover:bg-[#1b1464]/90 transition-colors" id="prep-gen-interview-btn">
              <span class="material-symbols-outlined text-lg">auto_awesome</span> Generar preguntas de entrevista
            </button>
          ` : `
            <div class="space-y-4" id="prep-interview-list">
              ${interview.map((q, i) => `
                <div class="border border-outline-variant/20 rounded-xl p-4">
                  <div class="flex items-start gap-2 mb-2">
                    <span class="w-6 h-6 rounded-full ${q.answer_text ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'} text-[10px] font-bold flex items-center justify-center shrink-0">${i + 1}</span>
                    <p class="text-sm font-medium text-on-surface">${esc(q.question_text)}</p>
                  </div>
                  <textarea class="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-lg resize-vertical focus:outline-none focus:ring-2 focus:ring-primary/15 min-h-[60px]"
                    placeholder="Tu respuesta..." data-key="${esc(q.question_key)}"
                    onfocus="this.style.minHeight='120px'">${esc(q.answer_text || '')}</textarea>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Block C: Gap Analysis -->
        <div class="bg-white rounded-2xl border border-outline-variant/20 p-6 mb-6">
          <h3 class="font-headline text-base font-bold text-primary mb-1 flex items-center gap-2">
            <span class="material-symbols-outlined text-lg">analytics</span> C. Analisis de gaps
          </h3>
          <p class="text-xs text-on-surface-variant mb-4">Estado actual del material disponible para la IA.</p>

          ${(gaps.strengths || []).map(s => `
            <div class="flex items-center gap-2 py-1.5">
              <span class="material-symbols-outlined text-sm text-green-500">check_circle</span>
              <span class="text-sm text-on-surface">${esc(s)}</span>
            </div>
          `).join('')}
          ${(gaps.gaps || []).map(g => `
            <div class="flex items-center gap-2 py-1.5">
              <span class="material-symbols-outlined text-sm text-amber-500">warning</span>
              <span class="text-sm text-on-surface">${esc(g.area)}: <span class="text-on-surface-variant">${esc(g.detail)}</span></span>
            </div>
          `).join('')}
        </div>

        <!-- Next step -->
        <div class="flex justify-between items-center">
          <button onclick="Developer._phase(1)" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-on-surface-variant border border-outline-variant hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined text-sm">arrow_back</span> Contexto
          </button>
          <button onclick="Developer._phase(2)" class="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#1b1464] text-[#e7eb00] font-bold text-base shadow-lg hover:scale-[1.03] active:scale-95 transition-all">
            <span class="material-symbols-outlined text-2xl">auto_awesome</span> Generar borrador
          </button>
        </div>
      </div>`;

    // Bind events
    document.getElementById('prep-doc-upload')?.addEventListener('change', handleDocUpload);
    bindInterviewAutosave();
  }

  async function handleDocUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', file.name.replace(/\.[^.]+$/, ''));
    try {
      await fetch('/v1/developer/projects/' + currentProject.id + '/research-docs', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + API.getToken() }, body: fd
      }).then(r => r.json());
      Toast.show('Documento subido y vectorizando...', 'ok');
      renderPrepStudio(); // Refresh
    } catch (err) { Toast.show('Error: ' + err.message, 'err'); }
    e.target.value = '';
  }

  function bindInterviewAutosave() {
    document.querySelectorAll('#prep-interview-list textarea').forEach(ta => {
      let timer;
      ta.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const key = ta.dataset.key;
          try {
            await API.put('/developer/projects/' + currentProject.id + '/interview/' + key, { answer: ta.value });
          } catch (e) { console.error('interview save:', e); }
        }, 1500);
      });
    });
  }

  async function genInterview() {
    const btn = document.getElementById('prep-gen-interview-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-spin w-4 h-4 border-2 border-[#e7eb00] border-t-transparent rounded-full"></span> Generando preguntas...'; }
    try {
      await API.post('/developer/projects/' + currentProject.id + '/interview/generate', {});
      renderPrepStudio();
    } catch (err) { Toast.show('Error: ' + err.message, 'err'); }
  }

  async function deleteDoc(docId) {
    if (!confirm('Eliminar este documento?')) return;
    try {
      await API.del('/developer/projects/' + currentProject.id + '/research-docs/' + docId);
      renderPrepStudio();
    } catch (err) { Toast.show('Error: ' + err.message, 'err'); }
  }

  /* ══════════════════════════════════════════════════════════════
     PHASE 2: Draft Generation
     ══════════════════════════════════════════════════════════════ */

  const TIPS = [
    'Los evaluadores disponen de menos de 1 hora por propuesta. Tu primer parrafo decide si siguen leyendo con interes.',
    'El criterio de Relevancia pesa un 30% de la puntuacion total. Conecta cada objetivo con las prioridades de la convocatoria.',
    'Las propuestas ganadoras mencionan a TODOS los socios por nombre al menos una vez en las secciones clave.',
    'Un buen analisis de necesidades se basa en datos concretos: estadisticas, estudios previos, informes oficiales.',
    'La innovacion no significa inventar algo nuevo: puede ser transferir una practica exitosa a un nuevo contexto o grupo.',
    'El valor anadido europeo es la clave: explica por que tu proyecto no podria funcionar a nivel nacional.',
    'Los evaluadores buscan coherencia: que el presupuesto refleje lo que describes en la narrativa.',
    'Un consorcio fuerte no es solo grande: cada socio debe tener un rol claro y justificado.',
    'La metodologia debe ser especifica: "workshops participativos" no basta, describe formato, duracion y participantes.',
    'El plan de gestion debe incluir mecanismos concretos: reuniones periodicas, herramientas de seguimiento, indicadores.',
    'La diseminacion no es solo redes sociales: incluye eventos multiplicadores, publicaciones, redes profesionales.',
    'La sostenibilidad es lo que pasa DESPUES del proyecto: como perviven los resultados sin financiacion EU.',
    'Los Work Packages deben tener interdependencias claras: el output de uno alimenta el siguiente.',
    'Las tablas de riesgos mas valoradas incluyen riesgos REALES, no genericos. Se especifico.',
    'El coste-eficiencia no es gastar poco: es demostrar que cada euro produce el maximo impacto posible.',
    'Los indicadores SMART (especificos, medibles, alcanzables, relevantes, temporales) son obligatorios para cada objetivo.',
    'Una buena propuesta referencia al menos 3-5 documentos oficiales de la UE relevantes para su tematica.',
    'El impacto a largo plazo debe ser ambicioso pero realista: que cambiara en 5 anos gracias a tu proyecto.',
    'Los evaluadores valoran especialmente la participacion de jovenes en el diseno y la toma de decisiones del proyecto.',
    'La coherencia entre el formulario Part B y el presupuesto Part A es uno de los puntos mas revisados.',
  ];

  let _tipTimer = null;

  async function renderPhase2() {
    phase = 2;
    const el = document.getElementById('developer-content');
    const total = flatSections.length;

    // Section status list
    const secListHTML = flatSections.map((sec, i) => `
      <div class="flex items-center gap-2 py-1.5" id="dev-sec-status-${i}">
        <span class="material-symbols-outlined text-sm text-red-400" id="dev-sec-icon-${i}">radio_button_unchecked</span>
        <span class="text-xs text-on-surface-variant" id="dev-sec-label-${i}">${sec.number} ${esc(sec.title.substring(0, 45))}</span>
      </div>
    `).join('');

    el.innerHTML = renderPhaseTabs(2) + `
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-8 py-4">
        <!-- Left: Writing animation + tips -->
        <div class="lg:col-span-3">
          <div class="flex flex-col items-center text-center mb-8">
            <!-- Pencil icon (static until generation starts) -->
            <div class="relative w-20 h-20 mb-2" id="dev-pencil-container">
              <div class="absolute inset-0 rounded-full bg-[#1b1464]/10"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="material-symbols-outlined text-4xl text-[#1b1464]" id="dev-pencil-icon">edit_note</span>
              </div>
            </div>
            <div class="font-headline text-lg font-extrabold text-[#1b1464] tracking-wider mb-3 h-6" id="dev-typing-text"></div>
            <h2 class="font-headline text-xl font-bold mb-1" id="dev-gen-title">Listo para escribir</h2>
            <p class="text-sm text-on-surface-variant mb-2" id="dev-gen-subtitle">Pulsa el boton para generar el borrador con IA</p>
            <div class="flex items-center gap-2 text-xs text-primary font-mono">
              <span id="dev-gen-count">0</span>/<span>${total}</span> secciones
            </div>
          </div>

          <!-- Progress bar -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold text-on-surface-variant" id="dev-gen-label">Preparando contexto...</span>
              <span class="text-xs text-primary font-mono" id="dev-gen-pct">0%</span>
            </div>
            <div class="h-3 rounded-full bg-outline-variant/15 overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-700" id="dev-gen-bar" style="width:0%"></div>
            </div>
          </div>

          <!-- Did you know? tips -->
          <div class="bg-[#1b1464] rounded-2xl p-5 mb-6 shadow-lg">
            <div class="flex items-start gap-3">
              <span class="material-symbols-outlined text-lg text-[#e7eb00] mt-0.5">lightbulb</span>
              <div>
                <div class="text-[10px] font-bold uppercase tracking-widest text-[#e7eb00] mb-1.5">Sabias que...</div>
                <p class="text-sm text-[#e7eb00]/90 leading-relaxed" id="dev-gen-tip">${TIPS[0]}</p>
              </div>
            </div>
          </div>

          <!-- Start / Continue buttons -->
          <div class="text-center space-y-3">
            <button onclick="Developer._startGeneration()" class="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#1b1464] text-[#e7eb00] font-bold text-base shadow-[0_24px_48px_rgba(27,20,100,0.2)] hover:scale-[1.03] active:scale-95 transition-all" id="dev-gen-start">
              <span class="material-symbols-outlined text-2xl">auto_awesome</span> Escribir borrador
            </button>
            <button onclick="Developer._phase(3)" class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-bold text-sm shadow-lg transition-all opacity-30 pointer-events-none" id="dev-gen-continue" style="display:none">
              <span class="material-symbols-outlined">edit_note</span> Continuar a edicion
            </button>
          </div>
        </div>

        <!-- Right: Section status list -->
        <div class="lg:col-span-2">
          <div class="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 sticky top-4">
            <h3 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 flex items-center gap-2">
              <span class="material-symbols-outlined text-sm">checklist</span> Secciones del formulario
            </h3>
            <div class="space-y-0.5 max-h-[60vh] overflow-y-auto">
              ${secListHTML}
            </div>
          </div>
        </div>
      </div>

      <style>
        @keyframes writePencil {
          0%, 100% { transform: rotate(-5deg) translateY(0); }
          25% { transform: rotate(5deg) translateY(-3px); }
          50% { transform: rotate(-3deg) translateY(1px); }
          75% { transform: rotate(4deg) translateY(-2px); }
        }
      </style>`;

    // Tips and typing start only when user clicks "Escribir borrador"
    // Wait for user to click — don't auto-start
    _tipTimer = setInterval(() => {
      tipIdx = (tipIdx + 1) % TIPS.length;
      const tipEl = document.getElementById('dev-gen-tip');
      if (tipEl) {
        tipEl.style.opacity = '0';
        setTimeout(() => {
          tipEl.textContent = TIPS[tipIdx];
          tipEl.style.opacity = '1';
        }, 300);
        tipEl.style.transition = 'opacity 0.3s';
      }
    }, 4000);

    // Wait for user to click — don't auto-start
  }

  async function runGeneration() {
    // Hide start button
    const startBtn = document.getElementById('dev-gen-start');
    if (startBtn) startBtn.style.display = 'none';

    // Activate pencil animation
    const pencilIcon = document.getElementById('dev-pencil-icon');
    const pencilBg = document.getElementById('dev-pencil-container')?.querySelector('div');
    if (pencilIcon) pencilIcon.style.animation = 'writePencil 1.5s ease-in-out infinite';
    if (pencilBg) pencilBg.classList.add('animate-pulse');
    const titleEl = document.getElementById('dev-gen-title');
    const subtitleEl = document.getElementById('dev-gen-subtitle');
    if (titleEl) titleEl.textContent = 'Escribiendo tu propuesta...';
    if (subtitleEl) subtitleEl.textContent = 'La IA esta redactando cada seccion con contexto completo del proyecto';

    // Start typing animation
    clearInterval(_typingTimer);
    (function startTyping() {
      const word = 'writing...';
      const el = document.getElementById('dev-typing-text');
      if (!el) return;
      let idx = 0;
      _typingTimer = setInterval(() => {
        if (!document.getElementById('dev-typing-text')) { clearInterval(_typingTimer); return; }
        idx++;
        if (idx <= word.length) { el.textContent = word.substring(0, idx); }
        else if (idx > word.length + 3) { idx = 0; el.textContent = ''; }
      }, 150);
    })();

    // Start tip rotation
    let tipIdx = 0;
    _tipTimer = setInterval(() => {
      tipIdx = (tipIdx + 1) % TIPS.length;
      const tipEl = document.getElementById('dev-gen-tip');
      if (tipEl) {
        tipEl.style.opacity = '0';
        setTimeout(() => { tipEl.textContent = TIPS[tipIdx]; tipEl.style.opacity = '1'; }, 300);
        tipEl.style.transition = 'opacity 0.3s';
      }
    }, 4000);

    const total = flatSections.length;
    const bar = document.getElementById('dev-gen-bar');
    const label = document.getElementById('dev-gen-label');
    const countEl = document.getElementById('dev-gen-count');
    const pctEl = document.getElementById('dev-gen-pct');
    const btn = document.getElementById('dev-gen-continue');

    // TEST MODE: only generate sections 1.1, 1.2, 1.3 — skip the rest
    const GEN_ONLY = ['summary_text', 's1_1_text', 's1_2_text', 's1_3_text'];

    for (let i = 0; i < flatSections.length; i++) {
      const sec = flatSections[i];
      const pct = Math.round(((i + 1) / total) * 100);
      const shouldGenerate = GEN_ONLY.includes(sec.fieldId);

      // Update UI
      if (label) label.textContent = `${sec.number} ${sec.title}`;
      if (countEl) countEl.textContent = i + 1;
      if (pctEl) pctEl.textContent = pct + '%';
      if (bar) bar.style.width = pct + '%';

      const icon = document.getElementById('dev-sec-icon-' + i);
      const lbl = document.getElementById('dev-sec-label-' + i);

      if (shouldGenerate) {
        // Mark as "working" (orange)
        if (icon) { icon.textContent = 'pending'; icon.className = 'material-symbols-outlined text-sm text-amber-500 animate-pulse'; }
        if (lbl) lbl.className = 'text-xs text-amber-700 font-bold';

        try {
          const result = await API.post('/developer/instances/' + currentInstance.id + '/generate', {
            sections: [sec.fieldId]
          });
          fieldValues[sec.fieldId] = { text: result[sec.fieldId] || '', section: sec.id };
          if (icon) { icon.textContent = 'check_circle'; icon.className = 'material-symbols-outlined text-sm text-green-500'; }
          if (lbl) lbl.className = 'text-xs text-green-700 font-medium';
        } catch (err) {
          if (icon) { icon.textContent = 'error'; icon.className = 'material-symbols-outlined text-sm text-red-500'; }
          if (lbl) lbl.className = 'text-xs text-red-600 font-medium';
        }
      } else {
        // Skip — mark as done immediately
        if (icon) { icon.textContent = 'check_circle'; icon.className = 'material-symbols-outlined text-sm text-gray-300'; }
        if (lbl) lbl.className = 'text-xs text-on-surface-variant/50';
      }
    }

    // TEST MODE: don't reload — keep only what was generated this session
    // Production: try { fieldValues = await API.get('/developer/instances/' + currentInstance.id + '/values'); } catch(e) {}

    // All done — celebration!
    clearInterval(_tipTimer);
    clearInterval(_typingTimer);
    if (bar) bar.style.width = '100%';

    // Replace the left column content with celebration
    const leftCol = bar?.closest('.lg\\:col-span-3');
    if (leftCol) {
      const totalWords = flatSections.reduce((s, sec) => s + (fieldValues[sec.fieldId]?.text?.split(/\s+/).length || 0), 0);
      leftCol.innerHTML = `
        <div class="flex flex-col items-center text-center py-6">
          <!-- Celebration animation -->
          <div class="relative w-24 h-24 mb-6">
            <div class="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30"></div>
            <div class="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <span class="material-symbols-outlined text-5xl text-white">celebration</span>
            </div>
          </div>

          <h2 class="font-headline text-2xl font-extrabold text-on-surface mb-2">Primer borrador completado</h2>
          <p class="text-base text-on-surface-variant mb-6 max-w-md">
            Tu propuesta tiene ya una base solida con <strong>${totalWords.toLocaleString('es-ES')} palabras</strong> distribuidas en <strong>${flatSections.length} secciones</strong>.
          </p>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-4 mb-8 w-full max-w-sm">
            <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <div class="font-headline text-xl font-extrabold text-green-600">${flatSections.length}</div>
              <div class="text-[9px] uppercase tracking-wider text-green-700 font-bold">Secciones</div>
            </div>
            <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <div class="font-headline text-xl font-extrabold text-green-600">${totalWords.toLocaleString('es-ES')}</div>
              <div class="text-[9px] uppercase tracking-wider text-green-700 font-bold">Palabras</div>
            </div>
            <div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <div class="font-headline text-xl font-extrabold text-green-600">100%</div>
              <div class="text-[9px] uppercase tracking-wider text-green-700 font-bold">Completo</div>
            </div>
          </div>

          <!-- Next steps -->
          <div class="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-5 mb-6 text-left w-full max-w-md">
            <h3 class="text-xs font-bold uppercase tracking-widest text-primary mb-3">Siguiente paso</h3>
            <p class="text-sm text-on-surface-variant leading-relaxed">
              Revisa cada seccion en el editor. Puedes <strong>evaluar</strong> contra los criterios oficiales,
              <strong>expandir</strong> las secciones que necesiten mas detalle, o <strong>simplificar</strong> las que sean demasiado largas.
            </p>
          </div>

          <button onclick="Developer._phase(3)" class="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-lg shadow-[0_24px_48px_rgba(27,20,100,0.15)] hover:scale-[1.03] hover:shadow-[0_28px_56px_rgba(27,20,100,0.2)] active:scale-95 transition-all">
            <span class="material-symbols-outlined text-2xl">edit_note</span>
            Revisar y mejorar propuesta
          </button>
        </div>`;
    }
  }

  /* ══════════════════════════════════════════════════════════════
     PHASE 3: Editor (3 columns)
     ══════════════════════════════════════════════════════════════ */
  async function renderPhase3() {
    phase = 3;
    const el = document.getElementById('developer-content');
    if (!activeFieldId && flatSections.length) activeFieldId = flatSections[0].fieldId;

    // TEST MODE: don't reload from server — only show what was just generated in this session
    // Production: try { fieldValues = await API.get('/developer/instances/' + currentInstance.id + '/values'); } catch(e) {}

    el.innerHTML = renderPhaseTabs(3) + `
      <div class="flex gap-0 -mx-4" style="height:calc(100vh - 180px)">
        <!-- Left: Section nav -->
        <div class="w-64 shrink-0 border-r border-outline-variant/20 overflow-y-auto px-3 py-2" id="dev-nav"></div>
        <!-- Center: Editor -->
        <div class="flex-1 overflow-y-auto px-6 py-2" id="dev-editor"></div>
        <!-- Right: AI panel -->
        <div class="w-72 shrink-0 border-l border-outline-variant/20 overflow-y-auto px-4 py-2" id="dev-ai-panel"></div>
      </div>`;

    renderNav();
    renderEditor();
    renderAIPanel();
  }

  function renderNav() {
    const nav = document.getElementById('dev-nav');
    if (!nav) return;

    let currentParent = null;
    let html = '';
    for (const sec of flatSections) {
      const val = fieldValues[sec.fieldId];
      const hasText = val && val.text && val.text.trim().length > 10;
      const reviewed = val && val.reviewed;
      const dot = reviewed ? 'text-green-500' : (hasText ? 'text-amber-400' : 'text-outline-variant/40');
      const isActive = sec.fieldId === activeFieldId;

      if (sec.parent && sec.parent !== currentParent) {
        currentParent = sec.parent;
        html += `<div class="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60 mt-4 mb-1 px-2">${sec.parentNumber}. ${esc(sec.parent)}</div>`;
      }

      html += `
        <button onclick="Developer._selectSection('${sec.fieldId}')" class="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${isActive ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-surface-container-low text-on-surface-variant'}">
          <span class="material-symbols-outlined text-xs ${dot}">circle</span>
          <span class="truncate">${sec.number} ${esc(sec.title.substring(0, 30))}</span>
        </button>`;
    }
    nav.innerHTML = html;
  }

  function renderEditor() {
    const editor = document.getElementById('dev-editor');
    if (!editor) return;

    const sec = flatSections.find(s => s.fieldId === activeFieldId);
    if (!sec) { editor.innerHTML = '<p class="text-sm text-on-surface-variant py-8">Selecciona una seccion.</p>'; return; }

    const val = fieldValues[sec.fieldId];
    const text = val?.text || '';
    const wc = wordCount(text);

    editor.innerHTML = `
      <div class="mb-4">
        <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">${sec.parentNumber ? sec.parentNumber + '. ' + esc(sec.parent) : 'Summary'}</div>
        <h2 class="font-headline text-lg font-bold text-on-surface">${sec.number} ${esc(sec.title)}</h2>
      </div>

      <!-- Guidance -->
      <details class="mb-4 group">
        <summary class="text-xs font-bold text-primary cursor-pointer flex items-center gap-1">
          <span class="material-symbols-outlined text-xs group-open:rotate-90 transition-transform">chevron_right</span> Guia del formulario
        </summary>
        <div class="mt-2 text-xs text-on-surface-variant leading-relaxed bg-primary/5 rounded-lg p-3 border border-primary/10">
          ${sec.guidance ? sec.guidance.split('\n').map(g => `<p class="mb-1">${esc(g)}</p>`).join('') : '<p>Sin guia disponible.</p>'}
        </div>
      </details>

      <!-- Text editor -->
      <textarea id="dev-textarea" class="w-full px-4 py-3 text-sm bg-white border border-outline-variant/30 rounded-xl resize-vertical focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary/30 leading-relaxed font-[system-ui]" style="min-height:400px" placeholder="Escribe o genera esta seccion con IA...">${esc(text)}</textarea>

      <div class="flex items-center justify-between mt-2">
        <span class="text-xs text-on-surface-variant">${wc} palabras</span>
        <div class="flex items-center gap-2">
          <button onclick="Developer._generateField('${sec.fieldId}')" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-primary border border-primary/30 hover:bg-primary/5 transition-colors">
            <span class="material-symbols-outlined text-sm">auto_awesome</span> Generar con IA
          </button>
          <button onclick="Developer._markReviewed('${sec.fieldId}')" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${val?.reviewed ? 'text-green-600 border-green-300 bg-green-50' : 'text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-low'} border transition-colors">
            <span class="material-symbols-outlined text-sm">${val?.reviewed ? 'check_circle' : 'radio_button_unchecked'}</span> ${val?.reviewed ? 'Revisada' : 'Marcar revisada'}
          </button>
        </div>
      </div>`;

    // Bind textarea autosave
    const textarea = document.getElementById('dev-textarea');
    if (textarea) {
      textarea.addEventListener('input', () => {
        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(() => {
          const newText = textarea.value;
          if (!fieldValues[sec.fieldId]) fieldValues[sec.fieldId] = {};
          fieldValues[sec.fieldId].text = newText;
          API.put('/developer/instances/' + currentInstance.id + '/field', {
            field_id: sec.fieldId, section_path: sec.id, text: newText
          }).catch(err => console.error('autosave field:', err));
          // Update word count
          const wcEl = textarea.parentElement?.nextElementSibling?.querySelector('span');
          if (wcEl) wcEl.textContent = wordCount(newText) + ' palabras';
        }, 1500);
      });
    }
  }

  function renderAIPanel() {
    const panel = document.getElementById('dev-ai-panel');
    if (!panel) return;

    const sec = flatSections.find(s => s.fieldId === activeFieldId);
    if (!sec) { panel.innerHTML = ''; return; }

    // Find matching eval criteria
    let relevantCriteria = [];
    if (evalCriteria.length && sec.parent) {
      const parentLower = sec.parent.toLowerCase();
      for (const es of evalCriteria) {
        if (es.title.toLowerCase().includes(parentLower.substring(0, 6))) {
          for (const q of (es.questions || [])) {
            relevantCriteria.push(q);
          }
        }
      }
    }

    panel.innerHTML = `
      <h3 class="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">Panel de IA</h3>

      <!-- Criteria -->
      ${relevantCriteria.length ? `
        <div class="mb-4">
          <div class="text-[10px] font-bold uppercase tracking-wider text-primary mb-2">Criterios de evaluacion</div>
          ${relevantCriteria.map(q => `
            <div class="mb-2 p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/10">
              <div class="text-xs font-medium text-on-surface mb-1">${esc(q.title)}</div>
              ${(q.criteria || []).slice(0, 2).map(c => `
                <div class="text-[10px] text-on-surface-variant leading-snug mb-0.5">\u2022 ${esc(c.label)}</div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="text-xs text-on-surface-variant/50 italic mb-4">Sin criterios vinculados a esta seccion.</div>
      `}

      <!-- AI actions -->
      <div class="space-y-2">
        <button onclick="Developer._aiImprove()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container-low transition-colors">
          <span class="material-symbols-outlined text-sm text-primary">psychology</span>
          <div>
            <div>Evaluar seccion</div>
            <div class="text-[10px] font-normal opacity-60">Analizar contra criterios</div>
          </div>
        </button>
        <button onclick="Developer._aiExpand()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container-low transition-colors">
          <span class="material-symbols-outlined text-sm text-primary">expand</span>
          <div>
            <div>Expandir texto</div>
            <div class="text-[10px] font-normal opacity-60">Anadir detalle y profundidad</div>
          </div>
        </button>
        <button onclick="Developer._aiSimplify()" class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-left text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container-low transition-colors">
          <span class="material-symbols-outlined text-sm text-primary">compress</span>
          <div>
            <div>Simplificar</div>
            <div class="text-[10px] font-normal opacity-60">Reducir sin perder contenido</div>
          </div>
        </button>
      </div>

      <!-- AI response area -->
      <div class="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10 min-h-[100px] text-xs text-on-surface-variant" id="dev-ai-response">
        <span class="text-on-surface-variant/40 italic">Las respuestas de la IA apareceran aqui.</span>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════════
     PHASE 4: Final Review
     ══════════════════════════════════════════════════════════════ */
  function renderPhase4() {
    phase = 4;
    const el = document.getElementById('developer-content');

    const stats = flatSections.map(sec => {
      const val = fieldValues[sec.fieldId];
      const text = val?.text || '';
      const wc = wordCount(text);
      const reviewed = val?.reviewed;
      return { ...sec, wc, reviewed, hasText: wc > 10 };
    });

    const totalSections = stats.length;
    const completed = stats.filter(s => s.hasText).length;
    const reviewed = stats.filter(s => s.reviewed).length;
    const totalWords = stats.reduce((s, x) => s + x.wc, 0);

    el.innerHTML = renderPhaseTabs(4) + `
      <div class="max-w-4xl">
        <h2 class="font-headline text-xl font-bold mb-1">Revision final</h2>
        <p class="text-sm text-on-surface-variant mb-6">Revisa el estado de cada seccion antes de enviar al evaluador.</p>

        <!-- Summary cards -->
        <div class="grid grid-cols-4 gap-3 mb-8">
          <div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-center">
            <div class="font-headline text-2xl font-extrabold text-primary">${completed}/${totalSections}</div>
            <div class="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Secciones escritas</div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-center">
            <div class="font-headline text-2xl font-extrabold text-green-600">${reviewed}</div>
            <div class="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Revisadas</div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-center">
            <div class="font-headline text-2xl font-extrabold text-on-surface">${totalWords.toLocaleString('es-ES')}</div>
            <div class="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Palabras</div>
          </div>
          <div class="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-center">
            <div class="font-headline text-2xl font-extrabold ${completed === totalSections ? 'text-green-600' : 'text-amber-500'}">${Math.round(completed / totalSections * 100)}%</div>
            <div class="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold">Completado</div>
          </div>
        </div>

        <!-- Section table -->
        <div class="bg-white rounded-xl border border-outline-variant/20 overflow-hidden mb-8">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-outline-variant/20 bg-surface-container-lowest">
                <th class="text-left px-4 py-2 text-xs font-bold uppercase text-on-surface-variant">#</th>
                <th class="text-left px-4 py-2 text-xs font-bold uppercase text-on-surface-variant">Seccion</th>
                <th class="text-center px-4 py-2 text-xs font-bold uppercase text-on-surface-variant">Palabras</th>
                <th class="text-center px-4 py-2 text-xs font-bold uppercase text-on-surface-variant">Estado</th>
                <th class="text-center px-4 py-2 text-xs font-bold uppercase text-on-surface-variant">Accion</th>
              </tr>
            </thead>
            <tbody>
              ${stats.map(s => `
                <tr class="border-b border-outline-variant/10 hover:bg-surface-container-lowest/50">
                  <td class="px-4 py-2 text-xs font-mono text-on-surface-variant">${s.number}</td>
                  <td class="px-4 py-2 font-medium">${esc(s.title)}</td>
                  <td class="px-4 py-2 text-center text-xs font-mono">${s.wc}</td>
                  <td class="px-4 py-2 text-center">
                    ${s.reviewed ? '<span class="text-green-600 text-xs font-bold">Revisada</span>'
                      : s.hasText ? '<span class="text-amber-500 text-xs font-bold">Generada</span>'
                      : '<span class="text-outline-variant text-xs">Vacia</span>'}
                  </td>
                  <td class="px-4 py-2 text-center">
                    <button onclick="Developer._selectSection('${s.fieldId}');Developer._phase(3)" class="text-xs text-primary font-bold hover:underline">Editar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button onclick="Developer._phase(3)" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-on-surface-variant border border-outline-variant hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined text-sm">edit_note</span> Seguir editando
          </button>
          <button onclick="Developer._sendToEvaluator()" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-lg transition-all ${completed < totalSections ? 'opacity-50' : ''}">
            <span class="material-symbols-outlined text-sm">verified</span> Enviar al evaluador
          </button>
        </div>
      </div>`;
  }

  /* ── Actions ───────────────────────────────────────────────── */
  function selectSection(fieldId) {
    activeFieldId = fieldId;
    if (phase === 3) { renderNav(); renderEditor(); renderAIPanel(); }
  }

  async function generateField(fieldId) {
    const textarea = document.getElementById('dev-textarea');
    if (textarea) textarea.value = 'Generando con IA...';
    try {
      const result = await API.post('/developer/instances/' + currentInstance.id + '/generate', { sections: [fieldId] });
      const text = result[fieldId] || '';
      if (!fieldValues[fieldId]) fieldValues[fieldId] = {};
      fieldValues[fieldId].text = text;
      if (textarea) textarea.value = text;
      renderNav();
    } catch (err) {
      if (textarea) textarea.value = 'Error al generar: ' + (err.message || err);
    }
  }

  function markReviewed(fieldId) {
    if (!fieldValues[fieldId]) fieldValues[fieldId] = {};
    fieldValues[fieldId].reviewed = !fieldValues[fieldId].reviewed;
    renderEditor();
    renderNav();
  }

  function goPhase(p) {
    switch (p) {
      case 1: renderPhase1(); break;
      case 15: renderPrepStudio(); break;
      case 2: renderPhase2(); break;
      case 3: renderPhase3(); break;
      case 4: renderPhase4(); break;
    }
  }

  function goBack() { phase = 0; init(); }

  async function sendToEvaluator() {
    if (!currentProject) return;
    try {
      await API.patch('/intake/projects/' + currentProject.id + '/launch', {});
      await API.patch('/developer/instances/' + currentInstance.id + '/status', { status: 'complete' });
      Toast.show('Propuesta enviada al evaluador', 'ok');
      location.hash = 'evaluator';
    } catch (err) {
      Toast.show('Error: ' + (err.message || err), 'err');
    }
  }

  async function aiImprove() {
    const el = document.getElementById('dev-ai-response');
    const sec = flatSections.find(s => s.fieldId === activeFieldId);
    const text = document.getElementById('dev-textarea')?.value || '';
    if (!text || !sec) { if (el) el.innerHTML = '<span class="text-amber-500">Escribe algo primero.</span>'; return; }
    if (el) el.innerHTML = '<div class="flex items-center gap-2 text-primary"><div class="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div> Evaluando...</div>';
    try {
      const result = await API.post('/developer/instances/' + currentInstance.id + '/evaluate', {
        text, section_title: sec.number + ' ' + sec.title, criteria: []
      });
      const d = result;
      const badge = { excellent: 'text-green-600 bg-green-50', good: 'text-blue-600 bg-blue-50', fair: 'text-amber-600 bg-amber-50', weak: 'text-red-600 bg-red-50' };
      el.innerHTML = `
        <div class="mb-2"><span class="text-xs font-bold uppercase px-2 py-0.5 rounded ${badge[d.overall] || ''}">${d.overall || '?'}</span> ${d.score_estimate ? '<span class="text-xs text-on-surface-variant ml-1">' + d.score_estimate + '/10</span>' : ''}</div>
        ${(d.strengths || []).map(s => '<div class="text-xs text-green-700 mb-0.5">+ ' + esc(s) + '</div>').join('')}
        ${(d.weaknesses || []).map(s => '<div class="text-xs text-red-600 mb-0.5">- ' + esc(s) + '</div>').join('')}
        ${(d.suggestions || []).map(s => '<div class="text-xs text-primary mb-0.5">\u2192 ' + esc(s) + '</div>').join('')}
      `;
    } catch (err) { if (el) el.innerHTML = '<span class="text-error text-xs">Error: ' + esc(err.message || err) + '</span>'; }
  }

  async function aiAction(action) {
    const el = document.getElementById('dev-ai-response');
    const textarea = document.getElementById('dev-textarea');
    const sec = flatSections.find(s => s.fieldId === activeFieldId);
    const text = textarea?.value || '';
    if (!text || !sec) { if (el) el.innerHTML = '<span class="text-amber-500">Escribe algo primero.</span>'; return; }
    if (el) el.innerHTML = '<div class="flex items-center gap-2 text-primary"><div class="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div> Procesando...</div>';
    try {
      const result = await API.post('/developer/instances/' + currentInstance.id + '/improve', {
        text, action, section_title: sec.number + ' ' + sec.title
      });
      if (textarea && result.text) {
        textarea.value = result.text;
        if (!fieldValues[sec.fieldId]) fieldValues[sec.fieldId] = {};
        fieldValues[sec.fieldId].text = result.text;
        await API.put('/developer/instances/' + currentInstance.id + '/field', {
          field_id: sec.fieldId, section_path: sec.id, text: result.text
        });
      }
      if (el) el.innerHTML = '<span class="text-green-600 text-xs">Texto actualizado.</span>';
    } catch (err) { if (el) el.innerHTML = '<span class="text-error text-xs">Error: ' + esc(err.message || err) + '</span>'; }
  }

  function aiExpand() { aiAction('expand'); }
  function aiSimplify() { aiAction('simplify'); }

  /* ── Public API ────────────────────────────────────────────── */
  return {
    init,
    _back: goBack,
    _startGeneration: runGeneration,
    _genInterview: genInterview,
    _deleteDoc: deleteDoc,
    _phase: goPhase,
    _selectSection: selectSection,
    _generateField: generateField,
    _markReviewed: markReviewed,
    _aiImprove: aiImprove,
    _aiExpand: aiExpand,
    _aiSimplify: aiSimplify,
    _sendToEvaluator: sendToEvaluator,
  };
})();
