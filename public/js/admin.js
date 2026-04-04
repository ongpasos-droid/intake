/* ═══════════════════════════════════════════════════════════════
   Admin — Data E+ reference tables management
   Sections: Convocatorias · Países · Per Diem · Personal
   ═══════════════════════════════════════════════════════════════ */

const Admin = (() => {
  let initialized = false;
  let activeSection = 'programs';

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    if (initialized) { loadSection(activeSection); return; }
    initialized = true;
    bindNav();
    loadSection('programs');
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
      case 'programs':  loadPrograms(); break;
      case 'countries': loadCountries(); break;
      case 'perdiem':   loadPerdiem(); break;
      case 'workers':   loadWorkers(); break;
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
      ? '<span class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Activo</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold">Inactivo</span>';
  }

  function actionBtns(id, section) {
    return `
      <button onclick="Admin.openEdit('${section}','${id}')" class="text-primary hover:underline text-xs font-semibold mr-3">Editar</button>
      <button onclick="Admin.confirmDelete('${section}','${id}')" class="text-error hover:underline text-xs font-semibold">Eliminar</button>`;
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
          <td class="px-4 py-3 text-xs font-mono text-on-surface-variant">${r.program_id}</td>
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
            { key: 'name',        type: 'text',   tdIndex: 1, value: row.name },
            { key: 'action_type', type: 'text',   tdIndex: 2, value: row.action_type },
            { key: 'deadline',    type: 'date',   tdIndex: 3, value: row.deadline ? row.deadline.slice(0,10) : '' },
            { key: 'eu_grant_max',type: 'number', tdIndex: 4, value: row.eu_grant_max },
            { key: 'active',      type: 'bool',   tdIndex: 5, value: row.active },
          ], `/admin/data/programs/${id}`, loadPrograms);
        }, { once: true });
      });
    } catch (e) { setError('admin-programs-tbody', 'Error al cargar: ' + e.message); }
  }

  /* ══ PAÍSES ══════════════════════════════════════════════════ */

  async function loadCountries() {
    setLoading('admin-countries-tbody');
    try {
      const rows = await API.get('/admin/data/countries');
      const tbody = document.getElementById('admin-countries-tbody');
      tbody.innerHTML = rows.map(r => `
        <tr data-id="${r.id}" class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 font-mono text-sm font-bold text-primary">${r.iso2}</td>
          <td class="px-4 py-3 font-medium">${r.name_es}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.name_en}</td>
          <td class="px-4 py-3 text-center">${r.eu_member ? '✅' : '—'}</td>
          <td class="px-4 py-3 text-center">${r.erasmus_eligible ? '✅' : '❌'}</td>
          <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">Zona ${r.perdiem_zone}</span></td>
          <td class="px-4 py-3">${badge(r.active)}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'countries')}</td>
        </tr>`).join('');

      tbody.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id;
        const row = rows.find(r => String(r.id) === id);
        tr.querySelector('[onclick*="openEdit"]')?.addEventListener('click', e => {
          e.preventDefault(); e.stopImmediatePropagation();
          makeRowEditable(tr, [
            { key: 'name_es',          type: 'text',   tdIndex: 1, value: row.name_es },
            { key: 'name_en',          type: 'text',   tdIndex: 2, value: row.name_en },
            { key: 'eu_member',        type: 'bool',   tdIndex: 3, value: row.eu_member },
            { key: 'erasmus_eligible', type: 'bool',   tdIndex: 4, value: row.erasmus_eligible },
            { key: 'perdiem_zone',     type: 'text',   tdIndex: 5, value: row.perdiem_zone },
            { key: 'active',           type: 'bool',   tdIndex: 6, value: row.active },
          ], `/admin/data/countries/${id}`, loadCountries);
        }, { once: true });
      });
    } catch (e) { setError('admin-countries-tbody', 'Error: ' + e.message); }
  }

  /* ══ PER DIEM ════════════════════════════════════════════════ */

  async function loadPerdiem() {
    setLoading('admin-perdiem-tbody');
    try {
      const rows = await API.get('/admin/data/perdiem');
      const tbody = document.getElementById('admin-perdiem-tbody');
      tbody.innerHTML = rows.map(r => `
        <tr data-id="${r.id}" class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 text-center"><span class="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold">Zona ${r.zone}</span></td>
          <td class="px-4 py-3 font-bold text-lg text-primary">€${Number(r.amount_day).toFixed(2)}<span class="text-xs text-on-surface-variant font-normal">/día</span></td>
          <td class="px-4 py-3 text-sm">${fmtDate(r.valid_from)}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${fmtDate(r.valid_to) || 'Vigente'}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.notes || '—'}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'perdiem')}</td>
        </tr>`).join('');

      tbody.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id;
        const row = rows.find(r => String(r.id) === id);
        tr.querySelector('[onclick*="openEdit"]')?.addEventListener('click', e => {
          e.preventDefault(); e.stopImmediatePropagation();
          makeRowEditable(tr, [
            { key: 'amount_day',  type: 'number', tdIndex: 1, value: row.amount_day },
            { key: 'valid_from',  type: 'date',   tdIndex: 2, value: row.valid_from ? row.valid_from.slice(0,10) : '' },
            { key: 'valid_to',    type: 'date',   tdIndex: 3, value: row.valid_to ? row.valid_to.slice(0,10) : '' },
            { key: 'notes',       type: 'text',   tdIndex: 4, value: row.notes },
          ], `/admin/data/perdiem/${id}`, loadPerdiem);
        }, { once: true });
      });
    } catch (e) { setError('admin-perdiem-tbody', 'Error: ' + e.message); }
  }

  /* ══ PERSONAL ════════════════════════════════════════════════ */

  async function loadWorkers() {
    setLoading('admin-workers-tbody');
    try {
      const rows = await API.get('/admin/data/workers');
      const tbody = document.getElementById('admin-workers-tbody');
      tbody.innerHTML = rows.map(r => `
        <tr data-id="${r.id}" class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 font-mono text-sm font-bold text-primary">${r.code}</td>
          <td class="px-4 py-3 font-medium">${r.name_es}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.name_en}</td>
          <td class="px-4 py-3 font-bold text-primary">€${Number(r.rate_day).toFixed(2)}<span class="text-xs text-on-surface-variant font-normal">/día</span></td>
          <td class="px-4 py-3">${badge(r.active)}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'workers')}</td>
        </tr>`).join('');

      tbody.querySelectorAll('tr[data-id]').forEach(tr => {
        const id = tr.dataset.id;
        const row = rows.find(r => String(r.id) === id);
        tr.querySelector('[onclick*="openEdit"]')?.addEventListener('click', e => {
          e.preventDefault(); e.stopImmediatePropagation();
          makeRowEditable(tr, [
            { key: 'name_es',  type: 'text',   tdIndex: 1, value: row.name_es },
            { key: 'name_en',  type: 'text',   tdIndex: 2, value: row.name_en },
            { key: 'rate_day', type: 'number', tdIndex: 3, value: row.rate_day },
            { key: 'active',   type: 'bool',   tdIndex: 4, value: row.active },
          ], `/admin/data/workers/${id}`, loadWorkers);
        }, { once: true });
      });
    } catch (e) { setError('admin-workers-tbody', 'Error: ' + e.message); }
  }

  /* ══ DELETE ══════════════════════════════════════════════════ */

  async function confirmDelete(section, id) {
    if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    try {
      const endpoints = { programs: 'programs', countries: 'countries', perdiem: 'perdiem', workers: 'workers' };
      await API.del(`/admin/data/${endpoints[section]}/${id}`);
      Toast.show('Eliminado correctamente', 'ok');
      loadSection(section);
    } catch (e) {
      Toast.show('Error al eliminar: ' + e.message, 'error');
    }
  }

  // kept for compatibility — now handled by inline listener
  function openEdit() {}

  return { init, openEdit, confirmDelete };
})();
