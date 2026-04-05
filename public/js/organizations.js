/* ═══════════════════════════════════════════════════════════════
   Organizations — Mi Organización + Directorio
   ═══════════════════════════════════════════════════════════════ */

const Organizations = (() => {
  let myOrgInit = false;
  let dirInit   = false;
  let myOrg     = null;   // cached org data
  let myOrgs    = [];     // all user's orgs
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
      bindOrgSelector();
    }
    loadMyOrgs();
  }

  function bindOrgSelector() {
    const sel = document.getElementById('myorg-org-select');
    sel?.addEventListener('change', async () => {
      const id = sel.value;
      if (!id) return;
      try {
        myOrg = await API.get(`/organizations/${id}`);
        fillForm(myOrg);
        loadAllChildren();
      } catch (e) { Toast.show(e.message || 'Error', 'error'); }
    });
    document.getElementById('myorg-btn-new-org')?.addEventListener('click', async () => {
      const name = await Modal.show('Nombre de la nueva organización:', { input: true });
      if (!name) return;
      try {
        const res = await API.put('/organizations/mine', { organization_name: name });
        Toast.show('Organización creada', 'ok');
        loadMyOrgs();
      } catch (e) { Toast.show(e.message || 'Error', 'error'); }
    });
  }

  async function loadMyOrgs() {
    try {
      myOrgs = await API.get('/organizations/mine/all') || [];
      const sel = document.getElementById('myorg-org-select');
      if (!sel) return;
      if (!myOrgs.length) {
        sel.innerHTML = '<option value="">— Sin organizaciones —</option>';
        myOrg = null;
        return;
      }
      sel.innerHTML = myOrgs.map(o =>
        `<option value="${o.id}">${esc(o.acronym ? o.acronym + ' — ' : '')}${esc(o.organization_name)}</option>`
      ).join('');
      // Load first org (or previously selected)
      const targetId = myOrg?.id || myOrgs[0].id;
      sel.value = targetId;
      myOrg = await API.get(`/organizations/${targetId}`);
      fillForm(myOrg);
      loadAllChildren();
    } catch (e) {
      console.error('loadMyOrgs', e);
      // Fallback to old single-org endpoint
      loadMyOrg();
    }
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

    // Logo upload
    document.getElementById('myorg-logo-input')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { Toast.show('El archivo es demasiado grande (máx. 2 MB)', 'error'); return; }
      const form = new FormData();
      form.append('logo', file);
      try {
        const res = await fetch('/v1/organizations/mine/logo', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + API.getToken() },
          body: form
        });
        const json = await res.json();
        if (!json.ok) throw json.error;
        showLogoPreview(json.data.logo_url);
        Toast.show('Logo actualizado', 'ok');
      } catch (err) { Toast.show(err.message || 'Error subiendo logo', 'error'); }
    });

    // Save buttons
    document.querySelectorAll('[data-org-save]').forEach(btn => {
      btn.addEventListener('click', () => saveSection(btn.dataset.orgSave));
    });

    // Add child buttons
    document.querySelectorAll('[data-org-add]').forEach(btn => {
      btn.addEventListener('click', () => addChild(btn.dataset.orgAdd));
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
    showLogoPreview(org.logo_url);
  }

  function showLogoPreview(url) {
    const container = document.getElementById('myorg-logo-preview');
    const placeholder = document.getElementById('myorg-logo-placeholder');
    if (!container) return;
    if (url) {
      const img = container.querySelector('img') || document.createElement('img');
      img.src = url + '?t=' + Date.now();
      img.alt = 'Logo';
      img.className = 'w-full h-full object-contain';
      if (!container.querySelector('img')) container.appendChild(img);
      if (placeholder) placeholder.style.display = 'none';
    } else {
      const img = container.querySelector('img');
      if (img) img.remove();
      if (placeholder) placeholder.style.display = '';
    }
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

  const CHILD_CONFIGS = {
    accreditations: [
      { f:'accreditation_type', label:'Tipo', ph:'Erasmus Charter, ECHE...' },
      { f:'accreditation_reference', label:'Referencia', ph:'Código de referencia' },
    ],
    'eu-projects': [
      { f:'programme', label:'Programa', ph:'Erasmus+, Horizon...' },
      { f:'year', label:'Año', ph:'2024', type:'number' },
      { f:'project_id_or_contract', label:'ID Contrato', ph:'2024-1-ES01-KA220...' },
      { f:'role', label:'Rol', ph:'Applicant, Partner...' },
      { f:'title', label:'Título', ph:'Título del proyecto' },
    ],
    'key-staff': [
      { f:'name', label:'Nombre', ph:'Nombre completo' },
      { f:'role', label:'Cargo', ph:'Director, Coordinador...' },
      { f:'skills_summary', label:'Competencias', ph:'Experiencia y habilidades relevantes' },
    ],
    stakeholders: [
      { f:'entity_name', label:'Entidad', ph:'Nombre de la entidad' },
      { f:'entity_type', label:'Tipo entidad', ph:'ONG, Universidad, Empresa...', select:['','NGO','University','School/Institute','Research Centre','SME','Large Enterprise','Public body','Foundation','Social enterprise','Other'] },
      { f:'relationship_type', label:'Relación', ph:'Partner, Funder, Beneficiary...' },
      { f:'contact_person', label:'Persona de contacto', ph:'Nombre completo' },
      { f:'email', label:'Email', ph:'email@ejemplo.com' },
      { f:'description', label:'Descripción', ph:'Descripción de la relación' },
    ],
  };

  function renderChildTable(type, rows) {
    const tbody = document.getElementById(`org-${type}-tbody`);
    if (!tbody) return;
    const fields = CHILD_CONFIGS[type] || [];

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${fields.length + 1}" class="py-4 text-center text-on-surface-variant text-sm">Sin registros. Pulsa + para añadir.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(row => `
      <tr class="border-t border-outline-variant/20 hover:bg-surface-container-low/30" data-child-id="${row.id}" data-child-type="${type}">
        ${fields.map(col => `<td class="px-3 py-2.5 text-sm text-on-surface">${esc(row[col.f]) || '<span class="text-on-surface-variant/40 italic">—</span>'}</td>`).join('')}
        <td class="px-3 py-2 text-right whitespace-nowrap">
          <button class="child-edit-btn text-on-surface-variant hover:text-primary p-1 rounded hover:bg-primary/10 transition-colors" title="Editar">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button class="child-del-btn text-on-surface-variant hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Eliminar">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </td>
      </tr>
    `).join('');

    // Bind edit & delete
    tbody.querySelectorAll('tr[data-child-id]').forEach(tr => {
      const childId = tr.dataset.childId;
      const childType = tr.dataset.childType;
      const row = rows.find(r => r.id === childId);

      tr.querySelector('.child-edit-btn').addEventListener('click', () => {
        openEditForm(childType, childId, row, tr);
      });
      tr.querySelector('.child-del-btn').addEventListener('click', () => {
        deleteChild(childType, childId);
      });
    });
  }

  function fieldHtml(col, val, attrName) {
    const cls = 'w-full px-3 py-2 text-sm border border-outline-variant/40 rounded-lg bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors';
    if (col.select) {
      return `<select ${attrName}="${col.f}" class="${cls}">
        ${col.select.map(opt => `<option value="${opt}" ${opt === (val || '') ? 'selected' : ''}>${opt || '— Seleccionar —'}</option>`).join('')}
      </select>`;
    }
    return `<input type="${col.type || 'text'}" value="${esc(val)}" placeholder="${col.ph}" ${attrName}="${col.f}" class="${cls}" />`;
  }

  function openEditForm(type, childId, row, afterTr) {
    document.querySelectorAll('.child-edit-row').forEach(r => r.remove());

    const fields = CHILD_CONFIGS[type] || [];
    const formTr = document.createElement('tr');
    formTr.className = 'child-edit-row bg-primary/5 border-t border-b border-primary/20';
    formTr.innerHTML = `
      <td colspan="${fields.length + 1}" class="px-3 py-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          ${fields.map(col => `
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">${col.label}</label>
              ${fieldHtml(col, row[col.f], 'data-edit-field')}
            </div>
          `).join('')}
        </div>
        <div class="flex justify-end gap-2">
          <button class="edit-cancel px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant border border-outline-variant hover:bg-surface-container-low transition-colors">Cancelar</button>
          <button class="edit-save px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors">Guardar</button>
        </div>
      </td>
    `;

    afterTr.after(formTr);
    formTr.querySelector('input')?.focus();

    formTr.querySelector('.edit-cancel').addEventListener('click', () => formTr.remove());
    formTr.querySelector('.edit-save').addEventListener('click', async () => {
      const data = {};
      formTr.querySelectorAll('[data-edit-field]').forEach(inp => {
        data[inp.dataset.editField] = inp.value || null;
      });
      try {
        await API.patch(`/organizations/${myOrg.id}/${type}/${childId}`, data);
        Toast.show('Actualizado', 'ok');
        formTr.remove();
        loadChildTable(type);
      } catch (e) {
        Toast.show(e.message || 'Error al guardar', 'error');
      }
    });
  }

  async function addChild(type) {
    if (!myOrg?.id) {
      Toast.show('Primero guarda los datos generales de tu organización', 'error');
      return;
    }
    // Show an add form at the bottom of the table
    const fields = CHILD_CONFIGS[type] || [];
    const tbody = document.getElementById(`org-${type}-tbody`);
    if (!tbody) return;

    // Remove existing add form
    tbody.querySelectorAll('.child-add-row').forEach(r => r.remove());
    document.querySelectorAll('.child-edit-row').forEach(r => r.remove());

    const defaults = {
      accreditations:  { accreditation_type: '', accreditation_reference: '' },
      'eu-projects':   { programme: 'Erasmus+', year: new Date().getFullYear(), project_id_or_contract: '', role: 'applicant', title: '' },
      'key-staff':     { name: '', role: '', skills_summary: '' },
      stakeholders:    { entity_name: '', entity_type: '', relationship_type: '', contact_person: '', email: '', description: '' },
    };
    const def = defaults[type] || {};

    const formTr = document.createElement('tr');
    formTr.className = 'child-add-row bg-green-50/50 border-t-2 border-primary/20';
    formTr.innerHTML = `
      <td colspan="${fields.length + 1}" class="px-3 py-4">
        <div class="text-[11px] font-bold uppercase tracking-widest text-primary mb-3">Nuevo registro</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          ${fields.map(col => `
            <div>
              <label class="block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">${col.label}</label>
              ${fieldHtml(col, def[col.f], 'data-add-field')}
            </div>
          `).join('')}
        </div>
        <div class="flex justify-end gap-2">
          <button class="add-cancel px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant border border-outline-variant hover:bg-surface-container-low transition-colors">Cancelar</button>
          <button class="add-save px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 transition-colors">Añadir</button>
        </div>
      </td>
    `;

    tbody.appendChild(formTr);
    formTr.querySelector('input')?.focus();

    formTr.querySelector('.add-cancel').addEventListener('click', () => formTr.remove());
    formTr.querySelector('.add-save').addEventListener('click', async () => {
      const data = {};
      formTr.querySelectorAll('[data-add-field]').forEach(inp => {
        data[inp.dataset.addField] = inp.value || null;
      });
      try {
        await API.post(`/organizations/${myOrg.id}/${type}`, data);
        Toast.show('Añadido', 'ok');
        formTr.remove();
        loadChildTable(type);
      } catch (e) {
        Toast.show(e.message || 'Error', 'error');
      }
    });
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
             data-view-org="${o.id}">
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

      // Bind view org clicks
      grid.querySelectorAll('[data-view-org]').forEach(card => {
        card.addEventListener('click', () => viewOrg(card.dataset.viewOrg));
      });

      // Pagination
      if (meta && meta.pages > 1) {
        const pagDiv = document.createElement('div');
        pagDiv.className = 'col-span-full flex items-center justify-center gap-4 pt-4';
        pagDiv.innerHTML = `
          <button class="dir-prev text-sm text-primary font-semibold ${dirPage <= 1 ? 'opacity-30 pointer-events-none' : ''}">&larr; Anterior</button>
          <span class="text-sm text-on-surface-variant">Página ${meta.page} de ${meta.pages}</span>
          <button class="dir-next text-sm text-primary font-semibold ${dirPage >= meta.pages ? 'opacity-30 pointer-events-none' : ''}">Siguiente &rarr;</button>
        `;
        grid.appendChild(pagDiv);
        pagDiv.querySelector('.dir-prev')?.addEventListener('click', () => dirPrev());
        pagDiv.querySelector('.dir-next')?.addEventListener('click', () => dirNext(meta.pages));
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

    const modal = document.createElement('div');
    modal.id = 'org-detail-modal';
    modal.className = 'fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto';
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
        <div class="bg-primary text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 class="font-headline text-lg font-bold">${esc(org.organization_name)}</h2>
            ${org.acronym ? `<span class="text-white/70 text-sm">${esc(org.acronym)}</span>` : ''}
          </div>
          <button class="org-modal-close text-white/70 hover:text-white">
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
    `;
    document.body.appendChild(modal);
    modal.querySelector('.org-modal-close')?.addEventListener('click', () => modal.remove());
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
