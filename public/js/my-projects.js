/* ═══════════════════════════════════════════════════════════════
   My Projects — List saved Erasmus+ project proposals
   ═══════════════════════════════════════════════════════════════ */

const MyProjects = (() => {

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

  function init() {
    loadProjects();
    document.getElementById('my-projects-new-btn')?.addEventListener('click', () => {
      location.hash = 'create';
    });
  }

  async function loadProjects() {
    const el = document.getElementById('my-projects-list');
    if (!el) return;
    el.innerHTML = '<p class="text-sm text-on-surface-variant py-8 text-center">Cargando proyectos...</p>';

    try {
      const result = await API.get('/intake/projects');
      const projects = Array.isArray(result) ? result : (result.data || result);

      if (!projects || projects.length === 0) {
        el.innerHTML = `
          <div class="flex flex-col items-center justify-center py-20 text-center">
            <span class="material-symbols-outlined text-6xl text-outline-variant/40 mb-4">folder_off</span>
            <h3 class="font-headline text-lg font-bold text-primary mb-2">No tienes proyectos todavía</h3>
            <p class="text-sm text-on-surface-variant mb-6 max-w-sm">Crea tu primera propuesta Erasmus+ y empieza a trabajar en ella.</p>
            <button type="button" id="my-projects-empty-new"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all">
              <span class="material-symbols-outlined text-lg">add</span> Crear mi primer proyecto
            </button>
          </div>`;
        document.getElementById('my-projects-empty-new')?.addEventListener('click', () => {
          App.navigate('intake', true, true);
        });
        return;
      }

      el.innerHTML = projects.map(p => {
        const statusColors = {
          draft: 'bg-amber-100 text-amber-700 border-amber-200',
          submitted: 'bg-green-100 text-green-700 border-green-200',
          approved: 'bg-blue-100 text-blue-700 border-blue-200'
        };
        const statusColor = statusColors[p.status] || 'bg-surface-container-low text-on-surface-variant border-outline-variant';
        return `
          <div class="flex items-center gap-4 p-4 rounded-xl border border-outline-variant/30 bg-white hover:border-primary hover:shadow-md cursor-pointer transition-all mb-2 group" data-project-id="${esc(p.id)}">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <span class="material-symbols-outlined text-primary text-xl">description</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-headline text-sm font-bold text-primary truncate">${esc(p.name)}</div>
              <div class="text-xs text-on-surface-variant mt-0.5">${esc(p.type || '')}</div>
            </div>
            <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor}">${esc(p.status || 'draft')}</span>
            <span class="text-xs text-on-surface-variant">${fmtDate(p.updated_at || p.created_at)}</span>
            <button type="button" class="my-projects-delete w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant/40 hover:bg-error/10 hover:text-error transition-colors opacity-0 group-hover:opacity-100" data-id="${esc(p.id)}" title="Eliminar">
              <span class="material-symbols-outlined text-base">delete</span>
            </button>
          </div>`;
      }).join('');

      // Bind click to open project in intake
      el.querySelectorAll('[data-project-id]').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.my-projects-delete')) return;
          const id = card.dataset.projectId;
          if (typeof Intake !== 'undefined') {
            Intake.openProject(id);
          }
        });
      });

      // Bind delete
      el.querySelectorAll('.my-projects-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('\u00BFEliminar este proyecto?')) return;
          try {
            await API.del('/intake/projects/' + btn.dataset.id);
            Toast.show('Proyecto eliminado', 'ok');
            loadProjects();
          } catch (err) {
            Toast.show('Error: ' + (err.message || err), 'err');
          }
        });
      });
    } catch (err) {
      console.error('MyProjects.loadProjects:', err);
      el.innerHTML = '<p class="text-sm text-error py-8 text-center">Error al cargar proyectos</p>';
    }
  }

  return { init };
})();
