/* ═══════════════════════════════════════════════════════════════
   Admin — Data E+ reference tables management
   Sections: Convocatorias · Países · Per Diem · Personal
   ═══════════════════════════════════════════════════════════════ */

const Admin = (() => {
  let initialized = false;
  let activeSection = 'evaluator';

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    if (initialized) { loadSection(activeSection); return; }
    initialized = true;
    bindNav();
    loadSection('evaluator');
  }

  /* ── Section nav ─────────────────────────────────────────────── */
  function bindNav() {
    document.querySelectorAll('#admin-section-nav [data-section]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSection = btn.dataset.section;
        document.querySelectorAll('#admin-section-nav [data-section]').forEach(b => {
          b.classList.remove('border-b-2', 'border-secondary-fixed', 'text-primary', 'font-bold');
          b.classList.add('text-on-surface-variant');
        });
        btn.classList.add('border-b-2', 'border-secondary-fixed', 'text-primary', 'font-bold');
        btn.classList.remove('text-on-surface-variant');
        loadSection(activeSection);
      });
    });
  }

  function loadSection(section) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`admin-sec-${section}`)?.classList.remove('hidden');
    switch (section) {
      case 'programs':    loadPrograms(); break;
      case 'countries':   loadCountries(); break;
      case 'perdiem':     loadPerdiem(); break;
      case 'workers':     loadWorkers(); bindWorkerAdd(); break;
      case 'entities':    loadEntities(); break;
      case 'eligibility': loadEligibility(); break;
      case 'evaluator':   loadEvaluator(); break;
      case 'platform-docs': loadPlatformDocs(); break;
    }
  }

  /* ── Generic helpers ─────────────────────────────────────────── */
  function setLoading(tbodyId) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = '<tr><td colspan="20" class="py-8 text-center text-on-surface-variant text-sm">Cargando...</td></tr>';
  }

  function setError(tbodyId, msg) {
    const el = document.getElementById(tbodyId);
    if (el) el.innerHTML = `<tr><td colspan="20" class="py-8 text-center text-error text-sm">${msg}</td></tr>`;
  }

  function fmtDate(d) { return d ? d.slice(0, 10) : '—'; }

  function badge(active) {
    return active
      ? '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">Active</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">Inactive</span>';
  }

  function actionBtns(id, section) {
    return `
      <button onclick="Admin.openEdit('${section}','${id}')" class="text-primary hover:underline text-xs font-semibold mr-3">Edit</button>
      <button onclick="Admin.confirmDelete('${section}','${id}')" class="text-gray-400 hover:text-red-500 text-xs font-semibold transition-colors">Delete</button>`;
  }

  /* ── Inline editor helper ────────────────────────────────────── */

  // Makes a <td> inline-editable. Returns the td element.
  function editable(value, type = 'text') {
    const td = document.createElement('td');
    td.className = 'px-4 py-2';
    if (type === 'bool') {
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = !!value;
      chk.className = 'w-4 h-4 accent-primary cursor-pointer';
      td.appendChild(chk);
    } else {
      const inp = document.createElement('input');
      inp.type = type === 'number' ? 'number' : type === 'date' ? 'date' : 'text';
      inp.value = value != null ? value : '';
      inp.className = 'w-full border border-outline rounded px-2 py-1 text-sm bg-surface focus:outline-none focus:ring-1 focus:ring-primary';
      if (type === 'number') { inp.step = '0.01'; inp.min = '0'; }
      td.appendChild(inp);
    }
    return td;
  }

  function editableTd(value, type = 'text') {
    const td = editable(value, type);
    return td.outerHTML; // fallback for innerHTML context (not used for inline, just kept)
  }

  // Reads value from an editable <td> created by editable()
  function readTd(td, type = 'text') {
    if (type === 'bool') return td.querySelector('input').checked ? 1 : 0;
    const v = td.querySelector('input').value.trim();
    return v === '' ? null : v;
  }

  // Switches a row to edit mode
  function makeRowEditable(tr, fields, endpoint, reloadFn) {
    // fields: array of { key, type, tdIndex } where tdIndex is the column index to replace
    const originalHTML = tr.innerHTML;

    // Replace target cells with inputs
    const cells = tr.querySelectorAll('td');
    const editCells = {};
    fields.forEach(({ key, type, tdIndex, value }) => {
      const newTd = editable(value, type);
      newTd.className = 'px-2 py-1';
      tr.replaceChild(newTd, cells[tdIndex]);
      editCells[key] = { td: newTd, type };
    });

    // Replace action cell with save/cancel
    const lastTd = tr.querySelector('td:last-child');
    lastTd.innerHTML = `
      <button class="btn-save text-primary hover:underline text-xs font-semibold mr-2">Guardar</button>
      <button class="btn-cancel text-on-surface-variant hover:underline text-xs">Cancelar</button>`;

    lastTd.querySelector('.btn-cancel').addEventListener('click', () => {
      tr.innerHTML = originalHTML;
    });

    lastTd.querySelector('.btn-save').addEventListener('click', async () => {
      const payload = {};
      Object.entries(editCells).forEach(([key, { td, type }]) => {
        payload[key] = readTd(td, type);
      });
      try {
        await API.patch(endpoint, payload);
        Toast.show('Guardado', 'ok');
        reloadFn();
      } catch (e) {
        Toast.show('Error: ' + e.message, 'error');
      }
    });
  }

  /* ══ CONVOCATORIAS ═══════════════════════════════════════════ */

  async function loadPrograms() {
    setLoading('admin-programs-tbody');
    try {
      const rows = await API.get('/admin/data/programs');
      const tbody = document.getElementById('admin-programs-tbody');
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-on-surface-variant text-sm">Sin convocatorias</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(r => `
        <tr data-id="${r.id}" class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 font-medium">${r.name}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.action_type}</td>
          <td class="px-4 py-3 text-sm">${fmtDate(r.deadline)}</td>
          <td class="px-4 py-3 text-sm">${r.eu_grant_max ? '€' + Number(r.eu_grant_max).toLocaleString('es-ES') : '—'}</td>
          <td class="px-4 py-3">${badge(r.active)}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'programs')}</td>
        </tr>`).join('');

      // Attach inline edit to each row
      tbody.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id;
        const row = rows.find(r => String(r.id) === id);
        tr.querySelector('[onclick*="openEdit"]')?.addEventListener('click', e => {
          e.preventDefault(); e.stopImmediatePropagation();
          makeRowEditable(tr, [
            { key: 'name',        type: 'text',   tdIndex: 0, value: row.name },
            { key: 'action_type', type: 'text',   tdIndex: 1, value: row.action_type },
            { key: 'deadline',    type: 'date',   tdIndex: 2, value: row.deadline ? row.deadline.slice(0,10) : '' },
            { key: 'eu_grant_max',type: 'number', tdIndex: 3, value: row.eu_grant_max },
            { key: 'active',      type: 'bool',   tdIndex: 4, value: row.active },
          ], `/admin/data/programs/${id}`, loadPrograms);
        }, { once: true });
      });
    } catch (e) { setError('admin-programs-tbody', 'Error al cargar: ' + e.message); }
  }

  /* ══ PAÍSES (con región y tipo de participación) ═════════════ */

  const TYPE_LABELS = {
    eu_member:     'EU Member',
    associated:    'Associated',
    third_partial: 'Third country'
  };
  const TYPE_COLORS = {
    eu_member:     'bg-blue-100 text-blue-800',
    associated:    'bg-blue-50 text-blue-600',
    third_partial: 'bg-gray-100 text-gray-600'
  };

  async function loadCountries() {
    setLoading('admin-countries-tbody');

    // Bind filters once
    ['countries-filter-type','countries-filter-zone'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.dataset.bound) { el.dataset.bound = '1'; el.addEventListener('change', loadCountries); }
    });

    // Load region filter once
    const regionSel = document.getElementById('countries-filter-region');
    if (regionSel && regionSel.options.length <= 1) {
      try {
        const regions = await API.get('/admin/data/eligibility/regions');
        regions.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.id;
          opt.textContent = `R${r.id} — ${r.name_es}`;
          regionSel.appendChild(opt);
        });
      } catch(_){}
      regionSel.addEventListener('change', loadCountries);
    }

    try {
      const type   = document.getElementById('countries-filter-type')?.value   || '';
      const zone   = document.getElementById('countries-filter-zone')?.value   || '';
      const region = regionSel?.value || '';

      const qs = new URLSearchParams();
      if (type)   qs.set('type', type);
      if (region) qs.set('region', region);
      let rows = await API.get('/admin/data/eligibility' + (qs.toString() ? '?' + qs : ''));
      if (zone) rows = rows.filter(r => r.perdiem_zone === zone);

      const tbody = document.getElementById('admin-countries-tbody');
      if (!rows.length) { tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-on-surface-variant text-sm">No results</td></tr>'; return; }
      tbody.innerHTML = rows.map(r => `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-2.5 font-mono text-sm font-bold text-primary">${r.iso2}</td>
          <td class="px-4 py-2.5 font-medium">${r.name_es}</td>
          <td class="px-4 py-2.5">
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLORS[r.participation_type] || ''}">
              ${TYPE_LABELS[r.participation_type] || r.participation_type || '—'}
            </span>
          </td>
          <td class="px-4 py-2.5 text-sm text-on-surface-variant">${r.erasmus_region ? 'R' + r.erasmus_region + ' — ' + (r.region_name_es || '') : '—'}</td>
          <td class="px-4 py-2.5 text-center"><span class="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">Zona ${r.perdiem_zone}</span></td>
          <td class="px-4 py-2.5 text-center">${r.erasmus_eligible ? '✅' : '❌'}</td>
        </tr>`).join('');
    } catch (e) { setError('admin-countries-tbody', 'Error: ' + e.message); }
  }

  /* ══ PER DIEM ════════════════════════════════════════════════ */

  const ZONE_STYLES = {
    A: { bg: '#1e3a5f', label: 'Alto coste' },
    B: { bg: '#2563eb', label: 'Medio-alto' },
    C: { bg: '#3b82f6', label: 'Medio' },
    D: { bg: '#60a5fa', label: 'Bajo coste' },
  };

  async function loadPerdiem() {
    const wrap = document.getElementById('admin-perdiem-cards');
    wrap.innerHTML = '<div class="col-span-full text-center py-8 text-on-surface-variant"><span class="spinner"></span></div>';
    try {
      const rows = await API.get('/admin/data/perdiem');
      wrap.innerHTML = rows.map(r => {
        const s = ZONE_STYLES[r.zone] || ZONE_STYLES.A;
        const accom = Number(r.amount_accommodation) || 0;
        const subs  = Number(r.amount_subsistence) || 0;
        const total = Number(r.amount_day) || 0;
        const pctA  = total ? Math.round(accom / total * 100) : 60;
        const pctS  = total ? Math.round(subs / total * 100) : 40;
        return `
        <div class="perdiem-card bg-white rounded-xl border border-outline-variant/30 overflow-hidden" data-id="${r.id}" data-zone="${r.zone}">
          <div class="px-4 py-3 text-white flex items-center justify-between" style="background:${s.bg}">
            <div>
              <span class="text-lg font-bold">Zona ${r.zone}</span>
              <span class="text-xs opacity-80 ml-2">${s.label}</span>
            </div>
            <span class="text-2xl font-black">€${total.toFixed(0)}</span>
          </div>
          <div class="p-4 space-y-3" data-mode="view">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base" style="color:${s.bg}">hotel</span>
                <span class="text-sm text-on-surface-variant">Alojamiento</span>
              </div>
              <span class="font-bold text-primary">€${accom.toFixed(2)}</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div class="h-full rounded-full" style="width:${pctA}%;background:${s.bg}"></div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-base" style="color:${s.bg}">restaurant</span>
                <span class="text-sm text-on-surface-variant">Manutención</span>
              </div>
              <span class="font-bold text-primary">€${subs.toFixed(2)}</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div class="h-full rounded-full opacity-60" style="width:${pctS}%;background:${s.bg}"></div>
            </div>
            <div class="pt-2 border-t border-outline-variant/20 flex justify-between items-center">
              <span class="text-xs text-on-surface-variant">${pctA}% / ${pctS}%</span>
              <button class="perdiem-edit-btn text-xs px-3 py-1 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 transition-colors flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">edit</span> Editar
              </button>
            </div>
          </div>
          <div class="p-4 space-y-3 hidden" data-mode="edit">
            <label class="block">
              <span class="text-xs text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-sm">hotel</span>Alojamiento €/día</span>
              <input type="number" step="0.01" name="amount_accommodation" value="${accom.toFixed(2)}"
                class="mt-1 w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            </label>
            <label class="block">
              <span class="text-xs text-on-surface-variant flex items-center gap-1"><span class="material-symbols-outlined text-sm">restaurant</span>Manutención €/día</span>
              <input type="number" step="0.01" name="amount_subsistence" value="${subs.toFixed(2)}"
                class="mt-1 w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
            </label>
            <div class="flex items-center justify-between pt-1">
              <span class="perdiem-edit-total text-sm font-bold text-primary">Total: €${total.toFixed(2)}</span>
              <div class="flex gap-2">
                <button class="perdiem-cancel-btn text-xs px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-gray-50">Cancelar</button>
                <button class="perdiem-save-btn text-xs px-3 py-1.5 rounded-lg bg-[#1b1464] text-[#e7eb00] font-semibold hover:bg-[#1b1464]/80">Save</button>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');

      /* bind card events */
      wrap.querySelectorAll('.perdiem-card').forEach(card => {
        const id = card.dataset.id;
        const zone = card.dataset.zone;
        const viewDiv = card.querySelector('[data-mode="view"]');
        const editDiv = card.querySelector('[data-mode="edit"]');
        const inpA = editDiv.querySelector('[name="amount_accommodation"]');
        const inpS = editDiv.querySelector('[name="amount_subsistence"]');
        const totalSpan = editDiv.querySelector('.perdiem-edit-total');

        const updateTotal = () => {
          const t = (parseFloat(inpA.value) || 0) + (parseFloat(inpS.value) || 0);
          totalSpan.textContent = `Total: €${t.toFixed(2)}`;
        };
        inpA.addEventListener('input', updateTotal);
        inpS.addEventListener('input', updateTotal);

        card.querySelector('.perdiem-edit-btn').addEventListener('click', () => {
          viewDiv.classList.add('hidden'); editDiv.classList.remove('hidden');
        });
        card.querySelector('.perdiem-cancel-btn').addEventListener('click', () => {
          editDiv.classList.add('hidden'); viewDiv.classList.remove('hidden');
        });
        card.querySelector('.perdiem-save-btn').addEventListener('click', async () => {
          try {
            await API.patch(`/admin/data/perdiem/${id}`, {
              zone,
              amount_accommodation: inpA.value,
              amount_subsistence: inpS.value,
            });
            Toast.show('Per diem actualizado', 'ok');
            loadPerdiem();
          } catch (e) { Toast.show('Error: ' + e.message, 'err'); }
        });
      });
    } catch (e) { wrap.innerHTML = `<div class="col-span-full text-center py-8 text-red-500">${e.message}</div>`; }
  }

  /* ══ PERSONAL (matriz categoría × zona) ═════════════════════ */

  const INP = 'px-2 py-1 border border-primary/30 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/20';

  async function loadWorkers() {
    setLoading('admin-workers-tbody');
    try {
      const rows = await API.get('/admin/data/workers/matrix');
      const tbody = document.getElementById('admin-workers-tbody');
      tbody.innerHTML = rows.map(r => `
        <tr data-id="${r.id}" class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors worker-row">
          <td class="px-4 py-3 font-mono text-sm font-bold text-primary worker-code">${r.code}</td>
          <td class="px-4 py-3 font-medium worker-name">${r.name_es}</td>
          ${['A','B','C','D'].map(z => `
            <td class="px-4 py-2 text-center worker-zone" data-zone="${z}" data-zone-id="${r.zones[z]?.id || ''}" data-rate="${r.zones[z]?.rate_day ?? ''}">
              <span class="font-bold text-primary text-sm">€${r.zones[z]?.rate_day ?? '—'}</span>
            </td>`).join('')}
          <td class="px-4 py-3">${badge(r.active)}</td>
          <td class="px-4 py-3 text-right worker-actions">
            <button class="worker-edit-btn text-xs px-2 py-1 rounded border border-primary/20 text-primary hover:bg-primary/5 transition-colors" title="Edit">
              <span class="material-symbols-outlined text-sm">edit</span>
            </button>
            <button class="worker-del-btn text-xs px-2 py-1 rounded border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors ml-1" title="Delete">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </td>
        </tr>`).join('');

      tbody.querySelectorAll('.worker-row').forEach(tr => {
        const id = tr.dataset.id;
        const row = rows.find(r => String(r.id) === id);
        tr.querySelector('.worker-edit-btn').addEventListener('click', () => workerMakeEditable(tr, row));
        tr.querySelector('.worker-del-btn').addEventListener('click', async () => {
          if (!confirm('Delete this category and all its zone rates?')) return;
          try { await API.del(`/admin/data/workers/${id}`); Toast.show('Deleted', 'ok'); loadWorkers(); }
          catch(e) { Toast.show('Error: ' + e.message, 'err'); }
        });
      });
    } catch (e) { setError('admin-workers-tbody', 'Error: ' + e.message); }
  }

  function workerMakeEditable(tr, row) {
    const codeTd = tr.querySelector('.worker-code');
    const nameTd = tr.querySelector('.worker-name');
    const actionsTd = tr.querySelector('.worker-actions');

    codeTd.innerHTML = `<input type="text" value="${row.code}" class="w-20 ${INP} font-mono">`;
    nameTd.innerHTML = `<input type="text" value="${row.name_es}" class="w-full ${INP}">`;

    tr.querySelectorAll('.worker-zone').forEach(td => {
      const rate = td.dataset.rate;
      const zone = td.dataset.zone;
      td.innerHTML = `<input type="number" step="0.01" value="${rate}" class="w-20 ${INP} text-center" data-zone="${zone}">`;
    });

    actionsTd.innerHTML = `
      <button class="worker-save-btn text-xs px-3 py-1 rounded bg-[#1b1464] text-[#e7eb00] font-semibold hover:bg-[#1b1464]/80">Save</button>
      <button class="worker-cancel-btn text-xs px-3 py-1 rounded border border-outline-variant/30 text-on-surface-variant ml-1">Cancel</button>`;

    actionsTd.querySelector('.worker-cancel-btn').addEventListener('click', () => loadWorkers());
    actionsTd.querySelector('.worker-save-btn').addEventListener('click', async () => {
      const newCode = codeTd.querySelector('input').value.trim();
      const newName = nameTd.querySelector('input').value.trim();
      if (!newCode || !newName) { Toast.show('Code and name required', 'err'); return; }
      try {
        // Save category
        await API.patch(`/admin/data/workers/${row.id}`, { code: newCode, name_es: newName, name_en: row.name_en, rate_day: 0, active: row.active });
        // Save each zone rate
        const zoneInputs = tr.querySelectorAll('.worker-zone input');
        for (const inp of zoneInputs) {
          const zone = inp.dataset.zone;
          const zoneId = tr.querySelector(`.worker-zone[data-zone="${zone}"]`).dataset.zoneId;
          if (zoneId && inp.value) {
            await API.patch(`/admin/data/workers/zone/${zoneId}`, { rate_day: Number(inp.value) });
          }
        }
        Toast.show('Category and rates saved', 'ok');
        loadWorkers();
      } catch(e) { Toast.show('Error: ' + e.message, 'err'); }
    });
  }

  function workerShowAddForm() {
    const tbody = document.getElementById('admin-workers-tbody');
    if (tbody.querySelector('.worker-add-row')) return;
    const tr = document.createElement('tr');
    tr.className = 'worker-add-row border-b border-outline-variant/30 bg-primary/5';
    tr.innerHTML = `
      <td class="px-4 py-2"><input type="text" placeholder="CODE" class="w-20 ${INP} font-mono" id="new-worker-code"></td>
      <td class="px-4 py-2"><input type="text" placeholder="Category name" class="w-full ${INP}" id="new-worker-name"></td>
      ${['A','B','C','D'].map(z => `
        <td class="px-4 py-2 text-center"><input type="number" step="0.01" placeholder="Zone ${z}" class="w-20 ${INP} text-center" id="new-worker-zone-${z}"></td>`).join('')}
      <td class="px-4 py-2">&nbsp;</td>
      <td class="px-4 py-2 text-right">
        <button id="new-worker-save" class="text-xs px-3 py-1 rounded bg-[#1b1464] text-[#e7eb00] font-semibold hover:bg-[#1b1464]/80">Add</button>
        <button id="new-worker-cancel" class="text-xs px-3 py-1 rounded border border-outline-variant/30 text-on-surface-variant ml-1">Cancel</button>
      </td>`;
    tbody.prepend(tr);
    tr.querySelector('#new-worker-code').focus();

    tr.querySelector('#new-worker-cancel').addEventListener('click', () => tr.remove());
    tr.querySelector('#new-worker-save').addEventListener('click', async () => {
      const code = tr.querySelector('#new-worker-code').value.trim();
      const name = tr.querySelector('#new-worker-name').value.trim();
      const rateA = tr.querySelector('#new-worker-zone-A').value;
      if (!code || !name || !rateA) { Toast.show('Code, name and at least Zone A rate required', 'err'); return; }
      try {
        await API.post('/admin/data/workers', { code, name_es: name, name_en: name, rate_day: Number(rateA), active: 1 });
        Toast.show('Category created with zone rates', 'ok');
        loadWorkers();
      } catch(e) { Toast.show('Error: ' + e.message, 'err'); }
    });
  }

  function bindWorkerAdd() {
    const btn = document.getElementById('worker-add-btn');
    if (btn && !btn.dataset.bound) { btn.dataset.bound = '1'; btn.addEventListener('click', workerShowAddForm); }
  }

  /* ══ ENTIDADES ═══════════════════════════════════════════════ */

  async function loadEntities() {
    setLoading('admin-entities-tbody');
    try {
      const rows = await API.get('/admin/data/entities');
      const tbody = document.getElementById('admin-entities-tbody');
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-8 text-center text-on-surface-variant text-sm">Sin entidades</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map(r => `
        <tr data-id="${r.id}" class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 font-medium">${r.name}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.city || '—'}</td>
          <td class="px-4 py-3 font-mono text-sm font-bold text-primary">${r.country_iso2}</td>
          <td class="px-4 py-3 text-sm"><span class="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">${r.type}</span></td>
          <td class="px-4 py-3 text-xs font-mono text-on-surface-variant">${r.pic_number || '—'}</td>
          <td class="px-4 py-3">${badge(r.active)}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'entities')}</td>
        </tr>`).join('');

      tbody.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id;
        const row = rows.find(r => String(r.id) === id);
        tr.querySelector('[onclick*="openEdit"]')?.addEventListener('click', e => {
          e.preventDefault(); e.stopImmediatePropagation();
          makeRowEditable(tr, [
            { key: 'name',         type: 'text', tdIndex: 0, value: row.name },
            { key: 'city',         type: 'text', tdIndex: 1, value: row.city },
            { key: 'country_iso2', type: 'text', tdIndex: 2, value: row.country_iso2 },
            { key: 'type',         type: 'text', tdIndex: 3, value: row.type },
            { key: 'pic_number',   type: 'text', tdIndex: 4, value: row.pic_number },
            { key: 'active',       type: 'bool', tdIndex: 5, value: row.active },
          ], `/admin/data/entities/${id}`, loadEntities);
        }, { once: true });
      });
    } catch (e) { setError('admin-entities-tbody', 'Error: ' + e.message); }
  }

  /* ══ DELETE ══════════════════════════════════════════════════ */

  async function confirmDelete(section, id) {
    const ok = await Modal.show('¿Eliminar este registro? Esta acción no se puede deshacer.');
    if (!ok) return;
    try {
      const endpoints = { programs: 'programs', countries: 'countries', perdiem: 'perdiem', workers: 'workers', entities: 'entities' };
      await API.del(`/admin/data/${endpoints[section]}/${id}`);
      Toast.show('Eliminado correctamente', 'ok');
      loadSection(section);
    } catch (e) {
      Toast.show('Error al eliminar: ' + e.message, 'error');
    }
  }

  /* ══ ELEGIBILIDAD POR CONVOCATORIA ══════════════════════════════ */

  const COUNTRY_TYPE_OPTIONS = [
    { value: 'eu_member',     label: 'EU Member States' },
    { value: 'associated',    label: 'Associated countries' },
    { value: 'third_partial', label: 'Third countries (partner)' },
  ];
  const ENTITY_TYPE_OPTIONS = [
    { value: 'ngo',         label: 'NGO / Youth NGO' },
    { value: 'public_body', label: 'Public body (local/regional/national)' },
    { value: 'university',  label: 'Education or research institution' },
    { value: 'foundation',  label: 'Foundation' },
    { value: 'for_profit',  label: 'For-profit organisation' },
    { value: 'social_enterprise', label: 'Social enterprise' },
  ];

  function eligShowView(v) {
    document.querySelectorAll('#admin-sec-eligibility .elig-view').forEach(el => el.classList.add('hidden'));
    document.getElementById(`elig-view-${v}`)?.classList.remove('hidden');
  }

  async function loadEligibility() {
    eligShowView('programs');
    const list = document.getElementById('elig-program-list');
    list.innerHTML = '<p class="text-sm text-on-surface-variant py-4">Loading...</p>';
    try {
      const programs = await API.get('/admin/data/programs');
      if (!programs.length) { list.innerHTML = '<p class="text-sm text-on-surface-variant py-8 text-center">No programmes found.</p>'; return; }
      list.innerHTML = programs.map(p => `
        <div class="elig-prog-card group flex items-center gap-4 p-5 bg-white rounded-2xl border border-outline-variant/30 hover:border-primary hover:shadow-lg cursor-pointer transition-all" data-id="${p.id}">
          <div class="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 group-hover:bg-secondary-fixed transition-colors">
            <span class="material-symbols-outlined text-white text-xl">verified</span>
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-bold text-primary truncate">${p.name}</h3>
            <p class="text-xs text-on-surface-variant">${p.action_type || '—'}</p>
          </div>
          <span class="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
        </div>`).join('');

      list.querySelectorAll('.elig-prog-card').forEach(card => {
        card.addEventListener('click', () => eligOpenProgram(card.dataset.id, programs.find(p => String(p.id) === card.dataset.id)?.name || ''));
      });
    } catch (e) { list.innerHTML = `<p class="text-red-500 text-sm">${e.message}</p>`; }
  }

  async function eligOpenProgram(programId, programName) {
    eligShowView('editor');
    document.getElementById('elig-program-title').textContent = programName + ' — Eligibility';
    document.getElementById('elig-back-btn').onclick = () => loadEligibility();

    const wrap = document.getElementById('elig-form-wrap');
    wrap.innerHTML = '<p class="text-sm text-on-surface-variant py-4"><span class="spinner"></span> Loading...</p>';

    try {
      const data = await API.get(`/admin/data/eligibility/call/${programId}`) || {};
      const countryTypes  = safeJSON(data.eligible_country_types, []);
      const entityTypes   = safeJSON(data.eligible_entity_types, []);
      const activityTypes = safeJSON(data.activity_location_types, []);

      wrap.innerHTML = `
      <!-- Country eligibility -->
      <div class="bg-white rounded-xl border border-outline-variant/30 p-5">
        <h3 class="font-bold text-primary text-sm flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-base">public</span> Eligible countries
        </h3>
        <p class="text-xs text-on-surface-variant mb-3">Which country types can submit applications?</p>
        <div class="space-y-2" id="elig-country-types">
          ${COUNTRY_TYPE_OPTIONS.map(o => `
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="${o.value}" class="accent-primary" ${countryTypes.includes(o.value) ? 'checked' : ''}>
              <span class="text-sm">${o.label}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Entity types -->
      <div class="bg-white rounded-xl border border-outline-variant/30 p-5">
        <h3 class="font-bold text-primary text-sm flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-base">business</span> Eligible entity types
        </h3>
        <p class="text-xs text-on-surface-variant mb-3">Which organisations can participate, and can they coordinate?</p>
        <div class="space-y-2" id="elig-entity-types">
          ${ENTITY_TYPE_OPTIONS.map(o => {
            const match = entityTypes.find(e => e.type === o.value);
            const checked = !!match;
            const canCoord = match ? match.can_coordinate : true;
            return `
            <div class="flex items-center gap-3 py-1">
              <input type="checkbox" value="${o.value}" class="elig-ent-check accent-primary" ${checked ? 'checked' : ''}>
              <span class="text-sm flex-1">${o.label}</span>
              <label class="flex items-center gap-1 text-xs text-on-surface-variant">
                <input type="checkbox" class="elig-ent-coord accent-primary" data-type="${o.value}" ${canCoord ? 'checked' : ''}>
                Can coordinate
              </label>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Consortium composition -->
      <div class="bg-white rounded-xl border border-outline-variant/30 p-5">
        <h3 class="font-bold text-primary text-sm flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-base">groups</span> Consortium composition
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label class="block">
            <span class="text-xs text-on-surface-variant">Min. partners (beneficiaries)</span>
            <input type="number" id="elig-min-partners" min="1" value="${data.min_partners || 1}"
              class="mt-1 w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          </label>
          <label class="block">
            <span class="text-xs text-on-surface-variant">Min. countries</span>
            <input type="number" id="elig-min-countries" min="1" value="${data.min_countries || 1}"
              class="mt-1 w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          </label>
          <label class="block">
            <span class="text-xs text-on-surface-variant">Max applications as coordinator</span>
            <input type="number" id="elig-max-coord" min="1" value="${data.max_coord_applications || ''}" placeholder="No limit"
              class="mt-1 w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
          </label>
        </div>
      </div>

      <!-- Activity location -->
      <div class="bg-white rounded-xl border border-outline-variant/30 p-5">
        <h3 class="font-bold text-primary text-sm flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-base">location_on</span> Activity location
        </h3>
        <p class="text-xs text-on-surface-variant mb-3">Where must activities take place?</p>
        <div class="space-y-2" id="elig-activity-types">
          ${COUNTRY_TYPE_OPTIONS.map(o => `
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="${o.value}" class="accent-primary" ${activityTypes.includes(o.value) ? 'checked' : ''}>
              <span class="text-sm">${o.label}</span>
            </label>`).join('')}
        </div>
      </div>

      <!-- Additional rules -->
      <div class="bg-white rounded-xl border border-outline-variant/30 p-5">
        <h3 class="font-bold text-primary text-sm flex items-center gap-2 mb-3">
          <span class="material-symbols-outlined text-base">description</span> Additional rules
        </h3>
        <textarea id="elig-additional-rules" rows="3" placeholder="Free text for additional eligibility notes..."
          class="w-full px-3 py-2 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">${data.additional_rules || ''}</textarea>
      </div>

      <!-- Save -->
      <div class="flex justify-end">
        <button id="elig-save-btn" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-[#e7eb00] bg-[#1b1464] hover:bg-[#1b1464]/80 transition-colors">
          <span class="material-symbols-outlined text-sm">save</span> Save eligibility
        </button>
      </div>`;

      // Save handler
      document.getElementById('elig-save-btn').addEventListener('click', async () => {
        const selCountry = [...document.querySelectorAll('#elig-country-types input:checked')].map(i => i.value);
        const selEntity  = [...document.querySelectorAll('#elig-entity-types .elig-ent-check:checked')].map(i => {
          const coordCb = document.querySelector(`.elig-ent-coord[data-type="${i.value}"]`);
          return { type: i.value, can_coordinate: coordCb?.checked ?? true, label: ENTITY_TYPE_OPTIONS.find(o => o.value === i.value)?.label || i.value };
        });
        const selActivity = [...document.querySelectorAll('#elig-activity-types input:checked')].map(i => i.value);

        try {
          await API.put(`/admin/data/eligibility/call/${programId}`, {
            eligible_country_types: selCountry,
            eligible_entity_types: selEntity,
            min_partners: document.getElementById('elig-min-partners').value,
            min_countries: document.getElementById('elig-min-countries').value,
            max_coord_applications: document.getElementById('elig-max-coord').value || null,
            activity_location_types: selActivity,
            additional_rules: document.getElementById('elig-additional-rules').value,
          });
          Toast.show('Eligibility saved', 'ok');
        } catch (e) { Toast.show('Error: ' + e.message, 'err'); }
      });
    } catch (e) { wrap.innerHTML = `<p class="text-red-500 text-sm">${e.message}</p>`; }
  }

  function safeJSON(val, fallback) {
    if (!val) return fallback;
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') try { return JSON.parse(val); } catch(_) { return fallback; }
    return fallback;
  }

  // kept for compatibility — now handled by inline listener
  function openEdit() {}

  /* ══ EVALUADOR (EACEA-style per program) ═════════════════════ */

  const EVAL_COLORS = ['#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#1e40af', '#1d4ed8', '#0369a1'];
  let ev = { programId: null, programName: '', sections: [], activeSectionIdx: 0, activeQuestionIdx: 0 };

  function evalShowView(view) {
    document.querySelectorAll('#admin-sec-evaluator .eval-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`eval-view-${view}`)?.classList.remove('hidden');
  }

  async function loadEvaluator() {
    ev = { programId: null, programName: '', sections: [], activeSectionIdx: 0, activeQuestionIdx: 0 };
    evalShowView('programs');
    const list = document.getElementById('eval-program-list');
    list.innerHTML = '<p class="text-sm text-on-surface-variant">Loading programmes...</p>';
    try {
      const programs = await API.get('/admin/data/programs');
      if (!programs.length) { list.innerHTML = '<p class="text-sm text-on-surface-variant py-8 text-center">No programmes found. Create one in the Convocatorias tab first.</p>'; return; }
      list.innerHTML = `<div class="mb-4">
        <button id="eval-new-program" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#e7eb00] bg-[#1b1464] hover:bg-[#1b1464]/80 transition-colors">
          <span class="material-symbols-outlined text-sm">add</span> New call / programme
        </button>
      </div>` + programs.map(p => `
        <div class="eval-prog-card group flex items-center gap-4 p-5 bg-white rounded-2xl border border-outline-variant/30 hover:border-primary hover:shadow-lg transition-all" data-id="${p.id}">
          <div class="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 group-hover:bg-secondary-fixed transition-colors cursor-pointer eval-prog-open">
            <span class="material-symbols-outlined text-secondary-fixed group-hover:text-primary text-2xl transition-colors">description</span>
          </div>
          <div class="flex-1 min-w-0 cursor-pointer eval-prog-open">
            <div class="font-headline font-bold text-on-surface group-hover:text-primary transition-colors">${p.name}</div>
            <div class="text-xs text-on-surface-variant mt-0.5">${p.action_type || ''} &middot; Deadline: ${p.deadline ? p.deadline.slice(0,10) : '\u2014'}</div>
          </div>
          <div class="flex items-center gap-2">
            <button class="eval-prog-del inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-semibold text-red-400 border border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors" data-id="${p.id}" data-name="${p.name.replace(/"/g, '&quot;')}">
              <span class="material-symbols-outlined text-sm">warning</span> Delete
            </button>
            <button class="eval-prog-open px-5 py-2 rounded-xl text-[11px] font-bold text-[#e7eb00] bg-[#1b1464] hover:bg-[#1b1464]/80 transition-colors inline-flex items-center gap-1.5">
              <span class="material-symbols-outlined text-sm">settings</span> Configure
            </button>
          </div>
        </div>`).join('');
      document.getElementById('eval-new-program')?.addEventListener('click', () => evalNewProgram());
      list.querySelectorAll('.eval-prog-card').forEach(card => {
        // Open programme on click (icon, name, configure)
        card.querySelectorAll('.eval-prog-open').forEach(el => {
          el.addEventListener('click', () => {
            const prog = programs.find(p => p.id === card.dataset.id);
            evalOpenProgram(prog.id, prog.name);
          });
        });
        // Delete button
        card.querySelector('.eval-prog-del')?.addEventListener('click', e => {
          e.stopPropagation();
          evalDeleteProgram(e.currentTarget.dataset.id, e.currentTarget.dataset.name);
        });
      });
    } catch (e) { list.innerHTML = `<p class="text-sm text-error">${e.message}</p>`; }
  }

  /* ── Delete programme with confirmation ─────────────────────── */
  function evalDeleteProgram(id, name) {
    // Create confirmation overlay
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]';
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" style="animation:critIn .2s ease">
        <div class="bg-red-50 px-6 py-4 flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <span class="material-symbols-outlined text-red-500 text-xl">warning</span>
          </div>
          <div>
            <h3 class="font-bold text-red-700 text-sm">Delete programme</h3>
            <p class="text-xs text-red-500">This action cannot be undone</p>
          </div>
        </div>
        <div class="px-6 py-4 space-y-3">
          <p class="text-sm text-on-surface-variant">This will permanently delete <strong class="text-primary">${name}</strong> and all its evaluation sections, questions and criteria.</p>
          <label class="block">
            <span class="text-xs text-on-surface-variant">Type <strong>DELETE</strong> to confirm:</span>
            <input type="text" id="del-confirm-input" placeholder="DELETE" autocomplete="off"
              class="mt-1 w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200">
          </label>
        </div>
        <div class="px-6 py-3 bg-gray-50 flex justify-end gap-2">
          <button id="del-cancel" class="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant border border-outline-variant/30 hover:bg-gray-100 transition-colors">Cancel</button>
          <button id="del-execute" disabled class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-400 cursor-not-allowed transition-colors">Delete programme</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const inp = overlay.querySelector('#del-confirm-input');
    const btn = overlay.querySelector('#del-execute');

    inp.focus();
    inp.addEventListener('input', () => {
      const match = inp.value.trim() === 'DELETE';
      btn.disabled = !match;
      btn.className = match
        ? 'px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer'
        : 'px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-400 cursor-not-allowed transition-colors';
    });

    overlay.querySelector('#del-cancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      btn.innerHTML = '<span class="spinner"></span> Deleting...';
      btn.disabled = true;
      try {
        await API.del(`/admin/data/programs/${id}`);
        Toast.show('Programme deleted', 'ok');
        overlay.remove();
        loadEvaluator();
      } catch (e) {
        Toast.show('Error: ' + e.message, 'err');
        overlay.remove();
      }
    });
  }

  /* ── New programme: create + seed template + open editor ────── */
  const EVAL_TEMPLATE = {
    sections: [
      { title: '1. Relevance of the project', color: '#1e3a5f', questions: [
        { code: '1.1', title: 'Background, context and rationale', maxScore: 10, threshold: 6 },
        { code: '1.2', title: 'Objectives and EU added value', maxScore: 10, threshold: 6 },
        { code: '1.3', title: 'Target groups and participants', maxScore: 10, threshold: 6 },
      ]},
      { title: '2. Quality of the project design', color: '#2563eb', questions: [
        { code: '2.1', title: 'Methodology and approach', maxScore: 10, threshold: 6 },
        { code: '2.2', title: 'Work plan and activities', maxScore: 10, threshold: 6 },
        { code: '2.3', title: 'Quality and risk management', maxScore: 10, threshold: 6 },
      ]},
      { title: '3. Quality of the partnership', color: '#3b82f6', questions: [
        { code: '3.1', title: 'Consortium composition and competence', maxScore: 10, threshold: 6 },
        { code: '3.2', title: 'Cooperation and communication', maxScore: 10, threshold: 6 },
      ]},
      { title: '4. Impact and dissemination', color: '#60a5fa', questions: [
        { code: '4.1', title: 'Expected impact and sustainability', maxScore: 10, threshold: 6 },
        { code: '4.2', title: 'Dissemination and exploitation of results', maxScore: 10, threshold: 6 },
        { code: '4.3', title: 'Wider impact and policy contribution', maxScore: 10, threshold: 6 },
      ]},
    ]
  };

  async function evalNewProgram() {
    try {
      Toast.show('Creating programme...', 'ok');
      const name = 'New programme';
      const { id } = await API.post('/admin/data/programs', {
        name,
        program_id: 'new_' + Date.now(),
        action_type: '',
        active: 1
      });
      await API.post(`/admin/data/eval/${id}/import`, EVAL_TEMPLATE);
      // Open directly into Call Data (activeSectionIdx = -1)
      evalOpenProgram(id, name);
    } catch (e) { Toast.show('Error: ' + e.message, 'err'); }
  }

  async function evalOpenProgram(programId, programName) {
    ev.programId = programId;
    ev.programName = programName;
    ev.activeSectionIdx = -1; // -1 = Call Data section
    ev.activeQuestionIdx = 0;
    evalShowView('editor');
    document.getElementById('eval-program-name').textContent = programName;

    // Bind back button
    const backBtn = document.getElementById('eval-back-btn');
    if (backBtn && !backBtn.dataset.bound) {
      backBtn.dataset.bound = '1';
      backBtn.addEventListener('click', loadEvaluator);
    }
    // Bind add section
    const addSecBtn = document.getElementById('eval-add-section-btn');
    if (addSecBtn && !addSecBtn.dataset.bound) {
      addSecBtn.dataset.bound = '1';
      addSecBtn.addEventListener('click', async () => {
        const title = prompt('Section title (e.g. Relevance):');
        if (!title) return;
        try {
          await API.post('/admin/data/eval/sections', { program_id: ev.programId, title, color: EVAL_COLORS[ev.sections.length % EVAL_COLORS.length], sort_order: ev.sections.length });
          await evalReload();
          Toast.show('Section added', 'ok');
        } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
      });
    }
    await evalReload();
  }

  async function evalReload() {
    ev.sections = await API.get('/admin/data/eval/' + ev.programId);
    evalRenderSidebar();
    evalRenderMain();
  }

  function evalRenderSidebar() {
    const container = document.getElementById('eval-sidebar-sections');
    if (!ev.sections.length) {
      container.innerHTML = '<p class="px-4 py-6 text-xs text-on-surface-variant text-center">No sections yet.<br>Add one below.</p>';
      return;
    }
    // Section 0: Call Data
    const callActive = ev.activeSectionIdx === -1;
    container.innerHTML = `
      <div class="eval-sidebar-sec mb-1">
        <div class="eval-sec-chip flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer ${callActive ? 'active' : ''}" data-si="-1">
          <span class="material-symbols-outlined text-sm ${callActive ? 'text-white' : 'text-primary/50'}">description</span>
          <span class="text-xs font-bold flex-1 truncate ${callActive ? '' : 'text-primary/70'}">Call Data</span>
        </div>
      </div>
      <div class="mx-3 my-2 border-b border-primary/10"></div>
    ` + ev.sections.map((sec, si) => {
      const isActive = si === ev.activeSectionIdx;
      const questions = sec.questions || [];
      return `
        <div class="eval-sidebar-sec mb-1" data-si="${si}">
          <div class="eval-sec-chip flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer ${isActive ? 'active' : ''}" data-si="${si}">
            <div class="eval-sec-dot w-3 h-3 rounded-full flex-shrink-0" style="background:${sec.color}"></div>
            <span class="text-xs font-bold flex-1 truncate ${isActive ? '' : 'text-primary/70'}">${sec.title}</span>
            <button class="eval-del-sec ${isActive ? 'text-white/40 hover:text-white' : 'text-primary/30 hover:text-error'} transition-colors" data-id="${sec.id}">
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
          ${isActive ? `<div class="ml-3 mt-1 mb-2 pl-3 border-l-2 border-primary/15">` +
            questions.map((q, qi) => {
              const isQ = qi === ev.activeQuestionIdx;
              return `<div class="eval-q-item flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${isQ ? 'active' : ''}" data-si="${si}" data-qi="${qi}">
                <span class="text-[11px] font-mono font-bold ${isQ ? 'text-primary' : 'text-primary/40'}">${q.code}</span>
                <span class="text-[11px] truncate ${isQ ? 'text-primary font-semibold' : 'text-on-surface-variant'}">${q.title}</span>
              </div>`;
            }).join('') +
            `<button class="eval-add-q flex items-center gap-1 px-3 py-1.5 mt-1 text-[11px] text-primary/50 hover:text-primary font-semibold transition-colors" data-si="${si}">
              <span class="material-symbols-outlined text-sm">add</span> Add question
            </button></div>` : ''}
        </div>`;
    }).join('');

    // Bind section clicks (including Call Data at -1)
    container.querySelectorAll('.eval-sec-chip[data-si]').forEach(div => {
      div.addEventListener('click', (e) => {
        if (e.target.closest('.eval-del-sec')) return;
        ev.activeSectionIdx = parseInt(div.dataset.si);
        ev.activeQuestionIdx = 0;
        evalRenderSidebar();
        evalRenderMain();
      });
    });
    // Bind question clicks
    container.querySelectorAll('.eval-q-item').forEach(div => {
      div.addEventListener('click', () => {
        ev.activeSectionIdx = parseInt(div.dataset.si);
        ev.activeQuestionIdx = parseInt(div.dataset.qi);
        evalRenderSidebar();
        evalRenderMain();
      });
    });
    // Bind add question
    container.querySelectorAll('.eval-add-q').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sec = ev.sections[parseInt(btn.dataset.si)];
        const code = prompt('Question code (e.g. 1.1):');
        if (!code) return;
        const title = prompt('Question title:');
        if (!title) return;
        try {
          await API.post('/admin/data/eval/questions', { section_id: sec.id, code, title, sort_order: (sec.questions || []).length });
          await evalReload();
          Toast.show('Question added', 'ok');
        } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
      });
    });
    // Bind delete section
    container.querySelectorAll('.eval-del-sec').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Delete this section and all its questions/criteria?')) return;
        try {
          await API.del('/admin/data/eval/sections/' + btn.dataset.id);
          ev.activeSectionIdx = 0; ev.activeQuestionIdx = 0;
          await evalReload();
          Toast.show('Deleted', 'ok');
        } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
      });
    });
  }

  function evalRenderMain() {
    const content = document.getElementById('eval-main-content');

    // Section -1: Call Data form
    if (ev.activeSectionIdx === -1) {
      evalRenderCallData(content);
      return;
    }

    const sec = ev.sections[ev.activeSectionIdx];
    if (!sec || !sec.questions || !sec.questions.length) {
      content.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center">
        <span class="material-symbols-outlined text-5xl text-outline-variant/40 mb-3">edit_note</span>
        <p class="text-sm text-on-surface-variant">Select a question from the sidebar to start editing.</p>
      </div>`;
      return;
    }
    const q = sec.questions[ev.activeQuestionIdx];
    if (!q) { content.innerHTML = ''; return; }
    const criteria = q.criteria || [];

    content.innerHTML = `
      <!-- Section + Question header -->
      <div class="flex items-center gap-3 mb-5">
        <div class="w-2 h-10 rounded-full" style="background:${sec.color}"></div>
        <div>
          <div class="text-[11px] font-bold uppercase tracking-widest" style="color:${sec.color}">${sec.title}</div>
          <h3 class="font-headline text-lg font-extrabold text-on-surface tracking-tight">${q.code} &mdash; ${q.title}</h3>
        </div>
      </div>

      <!-- Question config -->
      <div class="rounded-2xl border border-outline-variant/20 p-5 mb-5 bg-surface-container-lowest">
        <div class="flex items-center gap-2 mb-4">
          <span class="material-symbols-outlined text-sm" style="color:${sec.color}">tune</span>
          <span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Question configuration</span>
        </div>
        <div class="grid grid-cols-4 gap-3 mb-3">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Code</label>
            <input type="text" id="eq-code" value="${q.code}" class="px-3 py-2 rounded-lg border border-outline-variant text-sm font-mono font-bold focus:border-primary outline-none" style="color:${sec.color}">
          </div>
          <div class="col-span-3 flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title</label>
            <input type="text" id="eq-title" value="${q.title}" class="px-3 py-2 rounded-lg border border-outline-variant text-sm font-semibold focus:border-primary outline-none">
          </div>
        </div>
        <div class="flex flex-col gap-1 mb-3">
          <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Prompt / Instruction for the evaluator</label>
          <textarea id="eq-prompt" rows="3" class="px-3 py-2 rounded-lg border border-outline-variant text-sm focus:border-primary outline-none resize-vertical leading-relaxed">${q.prompt || ''}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Max score</label>
            <div class="flex items-center gap-2">
              <input type="number" id="eq-max" value="${q.max_score}" step="0.5" min="0" class="w-24 px-3 py-2 rounded-lg border border-outline-variant text-sm font-bold focus:border-primary outline-none text-center" style="color:${sec.color}">
              <span class="text-xs text-on-surface-variant">points</span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Threshold (min to pass)</label>
            <div class="flex items-center gap-2">
              <input type="number" id="eq-threshold" value="${q.threshold}" step="0.5" min="0" class="w-24 px-3 py-2 rounded-lg border border-outline-variant text-sm font-bold focus:border-primary outline-none text-center">
              <span class="text-xs text-on-surface-variant">points</span>
            </div>
          </div>
        </div>
        <div class="flex justify-end">
          <button id="eq-save" class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-[#e7eb00] bg-[#1b1464] hover:bg-[#1b1464]/80 transition-colors shadow-sm">
            <span class="material-symbols-outlined text-sm">save</span> Save question
          </button>
        </div>
      </div>

      <!-- Criteria -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-sm" style="color:${sec.color}">checklist</span>
            <span class="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Evaluation criteria</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="background:${sec.color}15;color:${sec.color}">${criteria.length}</span>
          </div>
          <button id="eval-add-crit" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#e7eb00] bg-[#1b1464] hover:bg-[#1b1464]/80 transition-colors shadow-sm">
            <span class="material-symbols-outlined text-sm">add</span> Add criterion
          </button>
        </div>
        <div id="eval-crit-list" class="grid gap-3">
          ${criteria.length === 0 ? '<div class="rounded-2xl border-2 border-dashed border-outline-variant/40 py-10 text-center"><span class="material-symbols-outlined text-3xl text-outline-variant/30 mb-2">playlist_add</span><p class="text-xs text-on-surface-variant">No criteria yet. Add one to define how this question is scored.</p></div>' :
            criteria.map((c, i) => evalCriterionCard(c, i, sec.color)).join('')}
        </div>
      </div>`;

    // Save question
    document.getElementById('eq-save')?.addEventListener('click', async () => {
      try {
        await API.patch('/admin/data/eval/questions/' + q.id, {
          code: document.getElementById('eq-code').value,
          title: document.getElementById('eq-title').value,
          prompt: document.getElementById('eq-prompt').value,
          max_score: parseFloat(document.getElementById('eq-max').value) || 0,
          threshold: parseFloat(document.getElementById('eq-threshold').value) || 0
        });
        await evalReload();
        Toast.show('Saved', 'ok');
      } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
    });
    // Add criterion — creates empty one and reloads
    document.getElementById('eval-add-crit')?.addEventListener('click', async () => {
      try {
        await API.post('/admin/data/eval/criteria', { question_id: q.id, title: 'New criterion', sort_order: criteria.length });
        await evalReload();
        Toast.show('Criterion added', 'ok');
      } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
    });
    evalBindCriteriaEvents(content);
  }

  async function evalRenderCallData(content) {
    // Fetch current program data
    let programs;
    try { programs = await API.get('/admin/data/programs'); } catch { programs = []; }
    const prog = programs.find(p => p.id === ev.programId) || {};
    const fmtDate = d => d ? d.slice(0, 10) : '';

    content.innerHTML = `
      <div class="flex items-center gap-3 mb-5">
        <div class="w-2 h-10 rounded-full bg-primary"></div>
        <div>
          <div class="text-[10px] font-bold uppercase tracking-widest text-primary">Programme / Call</div>
          <h3 class="font-headline text-lg font-extrabold text-on-surface tracking-tight">Call Data</h3>
        </div>
      </div>
      <div class="rounded-2xl border border-outline-variant/20 p-5 bg-surface-container-lowest">
        <div class="grid grid-cols-2 gap-4 mb-4">
          <div class="col-span-2 flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Programme name</label>
            <input type="text" id="cd-name" value="${prog.name || ''}" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm font-semibold focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Action type</label>
            <input type="text" id="cd-action-type" value="${prog.action_type || ''}" placeholder="e.g. KA3-Youth" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Deadline</label>
            <input type="date" id="cd-deadline" value="${fmtDate(prog.deadline)}" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">EU Grant max</label>
            <input type="number" id="cd-grant" value="${prog.eu_grant_max || ''}" step="1000" min="0" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Co-financing %</label>
            <input type="number" id="cd-cofin" value="${prog.cofin_pct || ''}" min="0" max="100" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Indirect costs %</label>
            <input type="number" id="cd-indirect" value="${prog.indirect_pct || ''}" step="0.01" min="0" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Min partners</label>
            <input type="number" id="cd-partners" value="${prog.min_partners || 2}" min="1" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Start date from</label>
            <input type="date" id="cd-start-min" value="${fmtDate(prog.start_date_min)}" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Start date to</label>
            <input type="date" id="cd-start-max" value="${fmtDate(prog.start_date_max)}" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Duration min (months)</label>
            <input type="number" id="cd-dur-min" value="${prog.duration_min_months || ''}" min="1" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Duration max (months)</label>
            <input type="number" id="cd-dur-max" value="${prog.duration_max_months || ''}" min="1" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none">
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</label>
            <select id="cd-active" class="px-3 py-2.5 rounded-xl border border-outline-variant text-sm focus:border-primary outline-none cursor-pointer">
              <option value="1" ${prog.active ? 'selected' : ''}>Active</option>
              <option value="0" ${!prog.active ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end">
          <button id="cd-save" class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-[#e7eb00] bg-[#1b1464] hover:bg-[#1b1464]/80 transition-colors shadow-sm">
            <span class="material-symbols-outlined text-sm">save</span> Save call data
          </button>
        </div>
      </div>`;

    document.getElementById('cd-save')?.addEventListener('click', async () => {
      try {
        await API.patch('/admin/data/programs/' + ev.programId, {
          name: document.getElementById('cd-name').value,
          action_type: document.getElementById('cd-action-type').value,
          deadline: document.getElementById('cd-deadline').value || null,
          eu_grant_max: document.getElementById('cd-grant').value || null,
          cofin_pct: document.getElementById('cd-cofin').value || null,
          indirect_pct: document.getElementById('cd-indirect').value || null,
          min_partners: document.getElementById('cd-partners').value || 2,
          start_date_min: document.getElementById('cd-start-min').value || null,
          start_date_max: document.getElementById('cd-start-max').value || null,
          duration_min_months: document.getElementById('cd-dur-min').value || null,
          duration_max_months: document.getElementById('cd-dur-max').value || null,
          active: parseInt(document.getElementById('cd-active').value)
        });
        ev.programName = document.getElementById('cd-name').value;
        document.getElementById('eval-program-name').textContent = ev.programName;
        Toast.show('Call data saved', 'ok');
      } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
    });
  }

  function evalCriterionCard(c, i, color) {
    const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    // Alternate subtle blue tints
    const tints = ['#f8fafc', '#eff6ff', '#f0f4fa', '#e8eef6', '#dbeafe', '#edf2f9'];
    const bg = tints[i % tints.length];
    return `
      <div class="eval-crit-card rounded-2xl border border-outline-variant/25 p-5 relative overflow-hidden" data-id="${c.id}" style="background:${bg};border-left-color:${color}">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shadow-sm" style="background:${color}">${i+1}</div>
            <div>
              <div class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Criterion ${i+1}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="px-2 py-0.5 rounded-lg text-[10px] font-bold" style="background:${color}15;color:${color}">max ${c.max_score} pts</span>
                ${c.mandatory ? '<span class="px-2 py-0.5 rounded-lg bg-blue-900/10 text-blue-900 text-[10px] font-bold">MANDATORY</span>' : '<span class="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-semibold">optional</span>'}
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="eval-save-crit inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#e7eb00] bg-[#1b1464] hover:bg-[#1b1464]/80 transition-colors shadow-sm" data-id="${c.id}">
              <span class="material-symbols-outlined text-sm">save</span> Save
            </button>
            <button class="eval-del-crit w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant/40 hover:bg-error/10 hover:text-error transition-colors" data-id="${c.id}">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        </div>
        <!-- Fields -->
        <div class="grid gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Title</label>
            <input type="text" data-field="title" value="${esc(c.title)}" class="ec-field px-3 py-2.5 rounded-xl border border-outline-variant/40 bg-white text-sm font-semibold focus:border-primary outline-none">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Meaning</label>
              <textarea data-field="meaning" rows="2" class="ec-field px-3 py-2 rounded-xl border border-outline-variant/40 bg-white text-xs focus:border-primary outline-none resize-vertical leading-relaxed">${esc(c.meaning)}</textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Structure</label>
              <textarea data-field="structure" rows="2" class="ec-field px-3 py-2 rounded-xl border border-outline-variant/40 bg-white text-xs focus:border-primary outline-none resize-vertical leading-relaxed">${esc(c.structure)}</textarea>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Relations</label>
              <textarea data-field="relations" rows="2" class="ec-field px-3 py-2 rounded-xl border border-outline-variant/40 bg-white text-xs focus:border-primary outline-none resize-vertical leading-relaxed">${esc(c.relations)}</textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Rules</label>
              <textarea data-field="rules" rows="2" class="ec-field px-3 py-2 rounded-xl border border-outline-variant/40 bg-white text-xs focus:border-primary outline-none resize-vertical leading-relaxed">${esc(c.rules)}</textarea>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Max score</label>
              <input type="number" data-field="max_score" value="${c.max_score}" step="0.5" min="0" class="ec-field px-3 py-2 rounded-xl border border-outline-variant/40 bg-white text-sm font-bold focus:border-primary outline-none" style="color:${color}">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Mandatory</label>
              <select data-field="mandatory" class="ec-field px-3 py-2 rounded-xl border border-outline-variant/40 bg-white text-sm focus:border-primary outline-none cursor-pointer">
                <option value="1" ${c.mandatory ? 'selected' : ''}>Yes</option>
                <option value="0" ${!c.mandatory ? 'selected' : ''}>No</option>
              </select>
            </div>
          </div>
        </div>
      </div>`;
  }

  function evalBindCriteriaEvents(container) {
    // Save individual criterion
    container.querySelectorAll('.eval-save-crit').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.eval-crit-item');
        const id = btn.dataset.id;
        const data = {};
        card.querySelectorAll('.ec-field').forEach(el => {
          const field = el.dataset.field;
          if (field === 'mandatory') data[field] = parseInt(el.value);
          else if (field === 'max_score') data[field] = parseFloat(el.value) || 0;
          else data[field] = el.value;
        });
        try {
          await API.patch('/admin/data/eval/criteria/' + id, data);
          Toast.show('Criterion saved', 'ok');
        } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
      });
    });
    // Delete criterion
    container.querySelectorAll('.eval-del-crit').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this criterion?')) return;
        try {
          await API.del('/admin/data/eval/criteria/' + btn.dataset.id);
          await evalReload();
          Toast.show('Deleted', 'ok');
        } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     PLATFORM DOCS — official documents management
     ══════════════════════════════════════════════════════════════ */

  let platformDocs = [];

  async function loadPlatformDocs() {
    const container = document.getElementById('admin-docs-list');
    container.innerHTML = '<p class="text-center py-8 text-on-surface-variant text-sm">Loading...</p>';
    try {
      const res = await API.get('/documents/official');
      platformDocs = res.data || [];
      renderPlatformDocs();
    } catch (e) {
      container.innerHTML = `<p class="text-center py-8 text-red-500 text-sm">Error: ${e.message}</p>`;
    }
    bindAdminDocUpload();
  }

  function renderPlatformDocs() {
    const container = document.getElementById('admin-docs-list');
    if (!platformDocs.length) {
      container.innerHTML = `<div class="text-center py-8 text-on-surface-variant">
        <span class="material-symbols-outlined text-[36px] opacity-30">description</span>
        <p class="mt-2 text-sm">No hay documentos oficiales aún.</p>
      </div>`;
      return;
    }
    container.innerHTML = platformDocs.map(d => {
      const tags = (d.tags || []).map(t => `<span class="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">${t}</span>`).join(' ');
      const size = d.file_size_bytes ? `${(d.file_size_bytes / 1024).toFixed(0)} KB` : '';
      const date = new Date(d.created_at).toLocaleDateString('es-ES');
      return `<div class="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-container-low transition-colors border border-outline-variant/20 mb-2">
        <span class="material-symbols-outlined text-[28px] text-primary/60">description</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-on-surface truncate">${d.title}</p>
          <p class="text-xs text-on-surface-variant">${d.file_type || ''} · ${size} · ${date}</p>
          <div class="flex gap-1 mt-1">${tags}</div>
        </div>
        <button class="admin-doc-delete text-on-surface-variant hover:text-red-500 transition-colors" data-id="${d.id}" title="Eliminar">
          <span class="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>`;
    }).join('');

    container.querySelectorAll('.admin-doc-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este documento?')) return;
        try {
          await API.del('/documents/official/' + btn.dataset.id);
          Toast.show('Documento eliminado', 'ok');
          loadPlatformDocs();
        } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
      });
    });
  }

  function bindAdminDocUpload() {
    const btn = document.getElementById('btn-admin-upload-doc');
    const modal = document.getElementById('admin-doc-upload-modal');
    const cancel = document.getElementById('btn-cancel-admin-upload');
    const form = document.getElementById('admin-doc-upload-form');
    if (!btn || btn._bound) return;
    btn._bound = true;

    btn.addEventListener('click', () => modal.classList.remove('hidden'));
    cancel.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const fileInput = document.getElementById('admin-doc-file');
      const file = fileInput.files[0];
      if (!file) return;

      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', document.getElementById('admin-doc-title').value || file.name);
      fd.append('description', document.getElementById('admin-doc-desc').value);
      fd.append('tags', document.getElementById('admin-doc-tags').value);
      fd.append('ownerType', 'platform');

      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/v1/documents/official', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: fd
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error?.message || 'Upload failed');
        Toast.show('Documento subido', 'ok');
        modal.classList.add('hidden');
        form.reset();
        loadPlatformDocs();
      } catch (e) { Toast.show('Error: ' + e.message, 'error'); }
    });
  }

  return { init, openEdit, confirmDelete };
})();
