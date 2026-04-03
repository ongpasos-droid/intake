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
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 text-xs font-mono text-on-surface-variant">${r.program_id}</td>
          <td class="px-4 py-3 font-medium">${r.name}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.action_type}</td>
          <td class="px-4 py-3 text-sm">${fmtDate(r.deadline)}</td>
          <td class="px-4 py-3 text-sm">${r.eu_grant_max ? '€' + Number(r.eu_grant_max).toLocaleString('es-ES') : '—'}</td>
          <td class="px-4 py-3">${badge(r.active)}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'programs')}</td>
        </tr>`).join('');
    } catch (e) { setError('admin-programs-tbody', 'Error al cargar: ' + e.message); }
  }

  /* ══ PAÍSES ══════════════════════════════════════════════════ */

  async function loadCountries() {
    setLoading('admin-countries-tbody');
    try {
      const rows = await API.get('/admin/data/countries');
      const tbody = document.getElementById('admin-countries-tbody');
      tbody.innerHTML = rows.map(r => `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 font-mono text-sm font-bold text-primary">${r.iso2}</td>
          <td class="px-4 py-3 font-medium">${r.name_es}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.name_en}</td>
          <td class="px-4 py-3 text-center">${r.eu_member ? '✅' : '—'}</td>
          <td class="px-4 py-3 text-center">${r.erasmus_eligible ? '✅' : '❌'}</td>
          <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-bold">Zona ${r.perdiem_zone}</span></td>
          <td class="px-4 py-3">${badge(r.active)}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'countries')}</td>
        </tr>`).join('');
    } catch (e) { setError('admin-countries-tbody', 'Error: ' + e.message); }
  }

  /* ══ PER DIEM ════════════════════════════════════════════════ */

  async function loadPerdiem() {
    setLoading('admin-perdiem-tbody');
    try {
      const rows = await API.get('/admin/data/perdiem');
      const tbody = document.getElementById('admin-perdiem-tbody');
      tbody.innerHTML = rows.map(r => `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 text-center"><span class="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold">Zona ${r.zone}</span></td>
          <td class="px-4 py-3 font-bold text-lg text-primary">€${Number(r.amount_day).toFixed(2)}<span class="text-xs text-on-surface-variant font-normal">/día</span></td>
          <td class="px-4 py-3 text-sm">${fmtDate(r.valid_from)}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${fmtDate(r.valid_to) || 'Vigente'}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.notes || '—'}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'perdiem')}</td>
        </tr>`).join('');
    } catch (e) { setError('admin-perdiem-tbody', 'Error: ' + e.message); }
  }

  /* ══ PERSONAL ════════════════════════════════════════════════ */

  async function loadWorkers() {
    setLoading('admin-workers-tbody');
    try {
      const rows = await API.get('/admin/data/workers');
      const tbody = document.getElementById('admin-workers-tbody');
      tbody.innerHTML = rows.map(r => `
        <tr class="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
          <td class="px-4 py-3 font-mono text-sm font-bold text-primary">${r.code}</td>
          <td class="px-4 py-3 font-medium">${r.name_es}</td>
          <td class="px-4 py-3 text-sm text-on-surface-variant">${r.name_en}</td>
          <td class="px-4 py-3 font-bold text-primary">€${Number(r.rate_day).toFixed(2)}<span class="text-xs text-on-surface-variant font-normal">/día</span></td>
          <td class="px-4 py-3">${badge(r.active)}</td>
          <td class="px-4 py-3 text-right">${actionBtns(r.id, 'workers')}</td>
        </tr>`).join('');
    } catch (e) { setError('admin-workers-tbody', 'Error: ' + e.message); }
  }

  /* ══ EDIT MODAL ══════════════════════════════════════════════ */

  function openEdit(section, id) {
    // Simple prompt-based editing — full modal can be built in next iteration
    Toast.show('Editor en construcción. Próximamente.', 'ok');
  }

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

  return { init, openEdit, confirmDelete };
})();
