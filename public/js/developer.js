/* ═══════════════════════════════════════════════════════════════
   Developer (Write) — Project cards for proposal writing
   ═══════════════════════════════════════════════════════════════ */

const Developer = (() => {

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
  }

  async function loadProjects() {
    const el = document.getElementById('developer-projects-list');
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
            <button type="button" id="developer-go-design"
              class="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all">
              <span class="material-symbols-outlined text-lg">add</span> Disenar proyecto
            </button>
          </div>`;
        document.getElementById('developer-go-design')?.addEventListener('click', () => {
          location.hash = 'create';
        });
        return;
      }

      el.innerHTML = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">' +
        projects.map(p => {
          const statusMap = {
            writing:    { label: 'Escribiendo', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: 'edit_note' },
            evaluating: { label: 'Evaluando',   color: 'bg-blue-100 text-blue-700 border-blue-200', icon: 'verified' },
          };
          const st = statusMap[p.status] || statusMap.writing;

          return `
          <div class="dev-project-card bg-white rounded-2xl border-2 border-outline-variant/20 hover:border-purple-400 p-5 cursor-pointer transition-all hover:shadow-lg group"
               data-project-id="${esc(p.id)}">
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <span class="material-symbols-outlined text-purple-600 text-xl">description</span>
              </div>
              <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${st.color}">${esc(st.label)}</span>
            </div>
            <h3 class="font-headline text-base font-bold text-on-surface mb-1 truncate group-hover:text-purple-700 transition-colors">${esc(p.name)}</h3>
            <p class="text-xs text-on-surface-variant mb-3">${esc(p.type || '')}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-on-surface-variant">${fmtDate(p.updated_at || p.created_at)}</span>
              <span class="inline-flex items-center gap-1 text-xs font-bold text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                Escribir <span class="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </div>
          </div>`;
        }).join('') + '</div>';

      // Bind click — por ahora toast, luego abrirá el editor
      el.querySelectorAll('.dev-project-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.projectId;
          const name = card.querySelector('h3')?.textContent || '';
          Toast.show('Próximamente: redactar propuesta de "' + name + '"', 'ok');
        });
      });

    } catch (err) {
      console.error('Developer.loadProjects:', err);
      el.innerHTML = '<p class="text-sm text-error py-8 text-center">Error al cargar proyectos</p>';
    }
  }

  return { init };
})();
