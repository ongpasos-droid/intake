/* ═══════════════════════════════════════════════════════════════
   Organizations — Mi Organización + Directorio
   ═══════════════════════════════════════════════════════════════ */

const Organizations = (() => {
  let myOrgInit = false;
  let dirInit   = false;
  let myOrg     = null;   // cached org data
  let activeTab = 'general';

  /* ── ORG TYPES ─────────────────────────────────────────────── */
  const ORG_TYPES = [
    'NGO','University','School/Institute','Research Centre','SME','Large Enterprise',
    'Public body','Foundation','Social enterprise','Other'
  ];

  /* ══════════════════════════════════════════════════════════════
     MI ORGANIZACIÓN
     ══════════════════════════════════════════════════════════════ */

  function initMyOrg() {
    if (!myOrgInit) {
      myOrgInit = true;
      bindMyOrgTabs();
    }
    loadMyOrg();
  }

  function bindMyOrgTabs() {
    document.querySelectorAll('#myorg-tab-nav [data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        document.querySelectorAll('#myorg-tab-nav [data-tab]').forEach(b => {
          b.classList.remove('border-b-2','border-secondary-fixed','text-primary','font-bold');
          b.classList.add('text-on-surface-variant');
        });
        btn.classList.add('border-b-2','border-secondary-fixed','text-primary','font-bold');
        btn.classList.remove('text-on-surface-variant');
        document.querySelectorAll('.myorg-tab').forEach(s => s.classList.add('hidden'));
        document.getElementById(`myorg-tab-${activeTab}`)?.classList.remove('hidden');
      });
    });
  }

  async function loadMyOrg() {
    try {
      myOrg = await API.get('/organizations/mine');
      if (myOrg) {
        fillForm(myOrg);
        loadAllChildren();
      }
    } catch (e) {
      console.error('loadMyOrg', e);
    }
  }

  function fillForm(org) {
    if (!org) return;
    const fields = document.querySelectorAll('#panel-my-org [data-field]');
    fields.forEach(el => {
      const key = el.dataset.field;
      const val = org[key];
      if (el.type === 'checkbox') {
        el.checked = !!val;
      } else if (el.tagName === 'SELECT') {
        el.value = val || '';
      } else {
        el.value = val != null ? val : '';
      }
    });
  }

  function collectSection(sectionId) {
    const data = {};
    document.querySelectorAll(`#${sectionId} [data-field]`).forEach(el => {
      const key = el.dataset.field;
      if (el.type === 'checkbox') data[key] = el.checked ? 1 : 0;
      else data[key] = el.value || null;
    });
    return data;
  }

  async function saveSection(sectionId) {
    try {
      const data = collectSection(sectionId);
      const result = await API.put('/organizations/mine', data);
      if (!myOrg) myOrg = {};
      Object.assign(myOrg, data);
      if (result.id) myOrg.id = result.id;
      Toast.show('Guardado correctamente', 'ok');
    } catch (e) {
      Toast.show(e.message || 'Error al guardar', 'error');
    }
  }

  /* ── Child tables (dynamic lists) ──────────────────────────── */

  async function loadAllChildren() {
    if (!myOrg?.id) return;
    loadChildTable('accreditations');
    loadChildTable('eu-projects');
    loadChildTable('key-staff');
    loadChildTable('stakeholders');
    loadChildTable('associated-partners');
  }

  async function loadChildTable(type) {
    if (!myOrg?.id) return;
    try {
      const rows = await API.get(`/organizations/${myOrg.id}/${type}`);
      renderChildTable(type, rows);
    } catch (e) {
      console.error(`loadChild ${type}`, e);
    }
  }

  function renderChildTable(type, rows) {
    const tbody = document.getElementById(`org-${type}-tbody`);
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="py-4 text-center text-on-surface-variant text-sm">Sin registros. Pulsa + para añadir.</td></tr>`;
      return;
    }

    const configs = {
      accreditations: [
        { f:'accreditation_type', ph:'Tipo (Erasmus Charter, ECHE...)' },
        { f:'accreditation_reference', ph:'Referencia / código' },
      ],
      'eu-projects': [
        { f:'programme', ph:'Programa (Erasmus+, H2020...)' },
        { f:'year', ph:'Año', type:'number' },
        { f:'project_id_or_contract', ph:'ID contrato' },
        { f:'role', ph:'Rol (applicant, partner...)' },
        { f:'title', ph:'Título del proyecto' },
      ],
      'key-staff': [
        { f:'name', ph:'Nombre completo' },
        { f:'role', ph:'Cargo / puesto' },
        { f:'skills_summary', ph:'Competencias y experiencia relevante' },
      ],
      stakeholders: [
        { f:'entity_name', ph:'Nombre de la entidad' },
        { f:'relationship_type', ph:'Tipo (partner, funder, beneficiary...)' },
        { f:'description', ph:'Breve descripción de la relación' },
      ],
      'associated-partners': [
        { f:'full_name', ph:'Nombre organización' },
        { f:'country', ph:'País' },
        { f:'city', ph:'Ciudad' },
        { f:'org_type', ph:'Tipo' },
        { f:'contact_person', ph:'Contacto' },
        { f:'relation_to_project', ph:'Relación con el proyecto' },
      ],
    };
    const fields = configs[type] || [];

    tbody.innerHTML = rows.map(row => `
      <tr class="border-t border-outline-variant/20 hover:bg-surface-container-low/50" data-child-id="${row.id}" data-child-type="${type}">
        ${fields.map(col => `<td class="px-2 py-1.5">
          <input type="${col.type || 'text'}" value="${esc(row[col.f])}" placeholder="${col.ph}"
            data-child-field="${col.f}"
            class="w-full px-2 py-1.5 text-sm border border-transparent rounded hover:border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary bg-transparent focus:bg-white transition-colors" />
        </td>`).join('')}
        <td class="px-2 py-1.5 text-right">
          <button onclick="Organizations.deleteChild('${type}','${row.id}')" class="text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors" title="Eliminar">
            <span class="material-symbols-outlined text-base">delete</span>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind auto-save on blur for every input
    tbody.querySelectorAll('input[data-child-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const tr = inp.closest('tr');
        const childId = tr.dataset.childId;
        const childType = tr.dataset.childType;
        const field = inp.dataset.childField;
        editChildInline(childType, childId, field, inp.value);
      });
    });
  }

  async function addChild(type) {
    if (!myOrg?.id) {
      Toast.show('Primero guarda los datos generales de tu organización', 'error');
      return;
    }
    const defaults = {
      accreditations:        { accreditation_type: '', accreditation_reference: '' },
      'eu-projects':         { programme: 'Erasmus +', year: new Date().getFullYear(), project_id_or_contract: '', role: 'applicant', beneficiary_name: '', title: '' },
      'key-staff':           { name: '', role: '', skills_summary: '' },
      stakeholders:          { entity_name: '', relationship_type: '', description: '' },
      'associated-partners': { full_name: '', country: '', city: '', org_type: '', contact_person: '', email: '', phone: '', website: '', relation_to_project: '' },
    };
    try {
      await API.post(`/organizations/${myOrg.id}/${type}`, defaults[type] || {});
      loadChildTable(type);
    } catch (e) {
      Toast.show(e.message || 'Error', 'error');
    }
  }

  async function deleteChild(type, id) {
    if (!myOrg?.id) return;
    const ok = await Modal.show('¿Eliminar este registro?');
    if (!ok) return;
    try {
      await API.del(`/organizations/${myOrg.id}/${type}/${id}`);
      loadChildTable(type);
    } catch (e) {
      Toast.show(e.message || 'Error', 'error');
    }
  }

  /* ── Inline edit for child rows ────────────────────────────── */
  async function editChildInline(type, id, field, newVal) {
    if (!myOrg?.id) return;
    try {
      await API.patch(`/organizations/${myOrg.id}/${type}/${id}`, { [field]: newVal });
    } catch (e) {
      Toast.show(e.message || 'Error', 'error');
    }
  }

  /* ══════════════════════════════════════════════════════════════
     DIRECTORIO DE ORGANIZACIONES
     ══════════════════════════════════════════════════════════════ */

  let dirPage = 1;

  function initDirectory() {
    if (!dirInit) {
      dirInit = true;
      document.getElementById('org-dir-search')?.addEventListener('input', debounce(loadDirectory, 400));
      document.getElementById('org-dir-country')?.addEventListener('change', () => { dirPage = 1; loadDirectory(); });
      document.getElementById('org-dir-type')?.addEventListener('change', () => { dirPage = 1; loadDirectory(); });
    }
    loadDirectory();
  }

  async function loadDirectory() {
    const q       = document.getElementById('org-dir-search')?.value || '';
    const country = document.getElementById('org-dir-country')?.value || '';
    const org_type = document.getElementById('org-dir-type')?.value || '';
    const grid    = document.getElementById('org-dir-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="col-span-full py-8 text-center text-on-surface-variant text-sm">Cargando...</div>';
    try {
      const res = await API.get(`/organizations?q=${encodeURIComponent(q)}&country=${encodeURIComponent(country)}&org_type=${encodeURIComponent(org_type)}&page=${dirPage}&limit=20`);
      const rows = res.rows || res;
      const meta = res.meta;

      if (!rows.length) {
        grid.innerHTML = '<div class="col-span-full py-12 text-center text-on-surface-variant">No se encontraron organizaciones</div>';
        return;
      }

      grid.innerHTML = rows.map(o => `
        <div class="bg-white rounded-xl border border-outline-variant/30 p-5 hover:shadow-md transition-shadow cursor-pointer"
             onclick="Organizations.viewOrg('${o.id}')">
          <div class="flex items-start justify-between mb-2">
            <h3 class="font-semibold text-primary text-sm leading-tight">${esc(o.organization_name)}</h3>
            ${o.acronym ? `<span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold ml-2 shrink-0">${esc(o.acronym)}</span>` : ''}
          </div>
          <div class="space-y-1 text-xs text-on-surface-variant">
            ${o.org_type ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">category</span>${esc(o.org_type)}</div>` : ''}
            ${o.country || o.city ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span>${esc([o.city,o.country].filter(Boolean).join(', '))}</div>` : ''}
            ${o.pic ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">fingerprint</span>PIC: ${esc(o.pic)}</div>` : ''}
            ${o.email ? `<div class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">mail</span>${esc(o.email)}</div>` : ''}
          </div>
          <div class="flex flex-wrap gap-1.5 mt-3">
            ${o.is_non_profit ? '<span class="text-[10px] font-semibold uppercase tracking-wider bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Non-profit</span>' : ''}
            ${o.is_public_body ? '<span class="text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Public body</span>' : ''}
            ${o.expertise_areas ? o.expertise_areas.split(',').slice(0,3).map(a => `<span class="text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">${esc(a.trim())}</span>`).join('') : ''}
          </div>
        </div>
      `).join('');

      // Pagination
      if (meta && meta.pages > 1) {
        grid.insertAdjacentHTML('beforeend', `
          <div class="col-span-full flex items-center justify-center gap-4 pt-4">
            <button onclick="Organizations.dirPrev()" class="text-sm text-primary font-semibold ${dirPage <= 1 ? 'opacity-30 pointer-events-none' : ''}">&larr; Anterior</button>
            <span class="text-sm text-on-surface-variant">Página ${meta.page} de ${meta.pages}</span>
            <button onclick="Organizations.dirNext(${meta.pages})" class="text-sm text-primary font-semibold ${dirPage >= meta.pages ? 'opacity-30 pointer-events-none' : ''}">Siguiente &rarr;</button>
          </div>
        `);
      }
    } catch (e) {
      grid.innerHTML = `<div class="col-span-full py-8 text-center text-error text-sm">${e.message || 'Error'}</div>`;
    }
  }

  function dirPrev() { if (dirPage > 1) { dirPage--; loadDirectory(); } }
  function dirNext(max) { if (dirPage < max) { dirPage++; loadDirectory(); } }

  /* ── View org detail modal ─────────────────────────────────── */
  async function viewOrg(id) {
    try {
      const org = await API.get(`/organizations/${id}`);
      showOrgDetailModal(org);
    } catch (e) {
      Toast.show(e.message || 'Error', 'error');
    }
  }

  function showOrgDetailModal(org) {
    let existing = document.getElementById('org-detail-modal');
    if (existing) existing.remove();

    const html = `
    <div id="org-detail-modal" class="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto" onclick="if(event.target===this)this.remove()">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden" onclick="event.stopPropagation()">
        <div class="bg-primary text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 class="font-headline text-lg font-bold">${esc(org.organization_name)}</h2>
            ${org.acronym ? `<span class="text-white/70 text-sm">${esc(org.acronym)}</span>` : ''}
          </div>
          <button onclick="document.getElementById('org-detail-modal').remove()" class="text-white/70 hover:text-white">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          ${detailSection('Datos generales', `
            ${detailRow('Tipo', org.org_type)}
            ${detailRow('PIC', org.pic)}
            ${detailRow('NIF / ID Nacional', org.national_id)}
            ${detailRow('Fecha fundación', org.foundation_date?.slice(0,10))}
            ${detailRow('País', org.country)}
            ${detailRow('Ciudad', org.city)}
            ${detailRow('Dirección', org.address)}
            ${detailRow('Código postal', org.post_code)}
            ${detailRow('Web', org.website ? `<a href="${esc(org.website)}" target="_blank" class="text-primary underline">${esc(org.website)}</a>` : null)}
            ${detailRow('Email', org.email)}
            ${detailRow('Teléfono', org.telephone1)}
            ${detailRow('Non-profit', org.is_non_profit ? 'Sí' : 'No')}
            ${detailRow('Public body', org.is_public_body ? 'Sí' : 'No')}
          `)}
          ${org.description ? detailSection('Descripción', `<p class="text-sm text-on-surface-variant whitespace-pre-line">${esc(org.description)}</p>`) : ''}
          ${org.activities_experience ? detailSection('Actividades y experiencia', `<p class="text-sm text-on-surface-variant whitespace-pre-line">${esc(org.activities_experience)}</p>`) : ''}
          ${(org.staff_size || org.annual_projects || org.expertise_areas || org.erasmus_roles) ? detailSection('Capacidad operativa', `
            ${detailRow('Tamaño staff', org.staff_size)}
            ${detailRow('Proyectos UE/año', org.annual_projects)}
            ${detailRow('Instalaciones formación', org.has_training_facilities ? 'Sí' : 'No')}
            ${detailRow('Infraestructura digital', org.has_digital_infrastructure ? 'Sí' : 'No')}
            ${detailRow('Áreas expertise', org.expertise_areas)}
            ${detailRow('Roles Erasmus', org.erasmus_roles)}
          `) : ''}
          ${org.eu_projects?.length ? detailSection('Proyectos UE', `
            <table class="w-full text-sm">
              <thead><tr class="text-xs text-on-surface-variant uppercase">
                <th class="text-left pb-1">Programa</th><th class="text-left pb-1">Año</th><th class="text-left pb-1">ID Contrato</th><th class="text-left pb-1">Rol</th><th class="text-left pb-1">Título</th>
              </tr></thead>
              <tbody>${org.eu_projects.map(p => `<tr class="border-t border-outline-variant/20">
                <td class="py-1">${esc(p.programme)}</td><td>${esc(p.year)}</td><td>${esc(p.project_id_or_contract)}</td><td>${esc(p.role)}</td><td>${esc(p.title)}</td>
              </tr>`).join('')}</tbody>
            </table>
          `) : ''}
          ${org.key_staff?.length ? detailSection('Personal clave', org.key_staff.map(s => `
            <div class="mb-2"><span class="font-semibold text-sm">${esc(s.name)}</span>${s.role ? ` <span class="text-xs text-on-surface-variant">(${esc(s.role)})</span>` : ''}<p class="text-xs text-on-surface-variant">${esc(s.skills_summary)}</p></div>
          `).join('')) : ''}
          ${org.stakeholders?.length ? detailSection('Stakeholders', org.stakeholders.map(s => `
            <div class="mb-2"><span class="font-semibold text-sm">${esc(s.entity_name)}</span> <span class="text-xs text-on-surface-variant">(${esc(s.relationship_type)})</span><p class="text-xs text-on-surface-variant">${esc(s.description)}</p></div>
          `).join('')) : ''}
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
  }

  function detailSection(title, content) {
    return `<div><h3 class="text-sm font-bold text-primary mb-2">${title}</h3><div>${content}</div></div>`;
  }
  function detailRow(label, val) {
    if (!val) return '';
    return `<div class="flex gap-2 text-sm py-0.5"><span class="text-on-surface-variant w-40 shrink-0">${label}</span><span class="font-medium">${val}</span></div>`;
  }

  /* ── Utils ──────────────────────────────────────────────────── */
  function esc(v) { if (v == null) return ''; const d = document.createElement('div'); d.textContent = String(v); return d.innerHTML; }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* ── Public API ─────────────────────────────────────────────── */
  return {
    initMyOrg, initDirectory, saveSection, addChild, deleteChild,
    editChildInline, viewOrg, dirPrev, dirNext, loadChildTable
  };
})();
