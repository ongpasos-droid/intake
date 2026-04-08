/* ═══════════════════════════════════════════════════════════════
   IntakeGantt — Activity/Task timeline planner
   Left: list of WP → activities/tasks with month selectors
   Right: Gantt bars that update live as dates are set
   ═══════════════════════════════════════════════════════════════ */

const IntakeGantt = (() => {

  let container = null;
  let projectId = null;

  function esc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const WP_COLORS = ['#1b1464','#1e40af','#0369a1','#0e7490','#155e75','#1d4ed8','#4338ca','#6366f1','#0284c7','#7c3aed'];
  function wpColor(i) { return WP_COLORS[i % WP_COLORS.length]; }

  const ACT_ICONS = {
    meeting:'groups', ltta:'flight_takeoff', io:'menu_book', me:'campaign', mgmt:'settings',
    local_ws:'school', campaign:'share', website:'language', artistic:'palette',
    equipment:'devices', goods:'inventory_2', consumables:'eco', other:'more_horiz',
  };

  /* ── Main render ───────────────────────────────────────────── */
  function render(el, pid) {
    container = el;
    projectId = pid;
    if (!container) return;

    const cs = (typeof Calculator !== 'undefined' && Calculator.isInitialized()) ? Calculator.getCalcState() : null;
    if (!cs || !cs.wps?.length) {
      container.innerHTML = `
        <h1 class="font-headline text-3xl font-extrabold tracking-tighter text-primary mb-1">Gantt del Proyecto</h1>
        <p class="text-on-surface-variant text-base mb-8">Define primero los Work Packages y actividades.</p>
        <div class="flex flex-col items-center justify-center py-16 text-center">
          <span class="material-symbols-outlined text-5xl text-outline-variant/40 mb-3">timeline</span>
          <p class="text-sm text-on-surface-variant">Vuelve al paso WPs.</p>
        </div>`;
      return;
    }

    const months = cs.financials?.indirectPct ? 36 : 36; // fallback
    const projMonths = getProjectMonths(cs);
    renderGantt(cs, projMonths);
  }

  function getProjectMonths(cs) {
    // Try to get from calculator state
    if (typeof Calculator !== 'undefined') {
      const s = Calculator.getCalcState();
      // Access internal project data
      try {
        const dur = s.wps?.[0]?.activities?.[0]?.date_end;
        // Estimate from project config
      } catch (e) {}
    }
    return 36; // default
  }

  /* ── Render full Gantt ─────────────────────────────────────── */
  function renderGantt(cs, totalMonths) {
    const wps = cs.wps;

    // Collect all rows: each WP + its activities
    const rows = [];
    for (let wi = 0; wi < wps.length; wi++) {
      const wp = wps[wi];
      const c = wpColor(wi);
      rows.push({ type: 'wp', wi, name: wp.name || wp.desc || `Work Package ${wi+1}`, color: c, start: null, end: null });
      for (const act of wp.activities) {
        // Parse existing dates to month numbers
        let startM = null, endM = null;
        if (act.date_start && act.date_end) {
          // Activities store ISO dates, convert to month offset
          // For now, use act.start_month / act.end_month if available
        }
        // Use start_month/end_month from activity if present, else try to compute
        startM = act._gantt_start ?? monthFromDate(act.date_start, cs);
        endM = act._gantt_end ?? monthFromDate(act.date_end, cs);

        rows.push({
          type: 'act', wi, act,
          name: act.label + (act.subtype_label ? ` — ${act.subtype_label}` : ''),
          icon: ACT_ICONS[act.type] || 'task',
          color: c,
          start: startM,
          end: endM,
        });
      }
    }

    // Month headers
    const monthCols = [];
    for (let m = 1; m <= totalMonths; m++) monthCols.push(m);

    let html = `
      <div class="mb-6">
        <h1 class="font-headline text-3xl font-extrabold tracking-tighter text-primary mb-1">Gantt del Proyecto</h1>
        <p class="text-on-surface-variant text-sm">Define el mes de inicio y fin de cada actividad. La barra se actualiza en tiempo real.</p>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-outline-variant/20 shadow-sm bg-white">
        <table class="w-full border-collapse" style="min-width: ${300 + totalMonths * 32}px">
          <thead>
            <tr>
              <th class="sticky left-0 z-10 bg-white text-left px-4 py-3 text-xs font-bold text-on-surface-variant border-b border-r border-outline-variant/20" style="min-width:280px">
                Actividad
              </th>
              <th class="text-center px-1 py-3 text-[10px] font-bold text-on-surface-variant border-b border-outline-variant/20 w-16">Inicio</th>
              <th class="text-center px-1 py-3 text-[10px] font-bold text-on-surface-variant border-b border-r border-outline-variant/20 w-16">Fin</th>
              ${monthCols.map(m => `<th class="text-center px-0 py-3 text-[9px] font-bold border-b border-outline-variant/10 w-8 ${m%6===0?'border-r border-outline-variant/20':''}" style="color:${m%6===0?'#1b1464':'#9ca3af'}">${m}</th>`).join('')}
            </tr>
          </thead>
          <tbody>`;

    for (const row of rows) {
      if (row.type === 'wp') {
        html += renderWPRow(row, totalMonths);
      } else {
        html += renderActRow(row, totalMonths);
      }
    }

    html += '</tbody></table></div>';

    // Legend
    html += `
      <div class="flex flex-wrap gap-4 mt-4 text-[10px] text-on-surface-variant">
        ${wps.map((wp, wi) => `<span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded" style="background:${wpColor(wi)}"></span> WP${wi+1} ${esc(wp.name||wp.desc||'')}</span>`).join('')}
      </div>`;

    // Nav buttons
    html += `
      <div class="flex justify-between items-center mt-10 pt-5 border-t border-outline-variant">
        <button data-goto="6" class="intake-step-nav-btn inline-flex items-center gap-2 px-5 py-3 rounded-md text-on-surface-variant font-semibold text-sm border border-outline-variant hover:bg-surface-container-low transition-colors">
          <span class="material-symbols-outlined text-base">arrow_back</span> Tareas
        </button>
        <button data-goto="8" class="intake-step-nav-btn inline-flex items-center gap-2 px-8 py-4 rounded-md bg-secondary-fixed text-primary-container font-bold text-base shadow-[0_24px_48px_rgba(27,20,100,0.1)] hover:scale-[1.02] active:scale-95 transition-transform">
          Resumen <span class="material-symbols-outlined text-lg">arrow_forward</span>
        </button>
      </div>`;

    container.innerHTML = html;
    bindEvents(cs, totalMonths);

    // Nav
    container.querySelectorAll('.intake-step-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.goto);
        if (typeof Intake !== 'undefined' && Intake._calcNav) Intake._calcNav(step);
      });
    });
  }

  /* ── WP header row ─────────────────────────────────────────── */
  function renderWPRow(row, totalMonths) {
    return `
      <tr style="background:${row.color}06">
        <td class="sticky left-0 z-10 px-4 py-2.5 border-b border-r border-outline-variant/20 font-bold text-xs" style="background:${row.color}06; color:${row.color}">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style="background:${row.color}">W${row.wi+1}</span>
            ${esc(row.name)}
          </div>
        </td>
        <td class="border-b border-outline-variant/20" colspan="${2 + totalMonths}" style="background:${row.color}04"></td>
      </tr>`;
  }

  /* ── Activity row with month selectors + bar ───────────────── */
  function renderActRow(row, totalMonths) {
    const s = row.start || '';
    const e = row.end || '';

    // Build month options
    const opts = '<option value="">—</option>' + Array.from({length:totalMonths}, (_,i) => `<option value="${i+1}" ${(i+1)==s?'selected':''}>${i+1}</option>`).join('');
    const optsEnd = '<option value="">—</option>' + Array.from({length:totalMonths}, (_,i) => `<option value="${i+1}" ${(i+1)==e?'selected':''}>${i+1}</option>`).join('');

    // Gantt cells
    let cells = '';
    for (let m = 1; m <= totalMonths; m++) {
      const active = s && e && m >= s && m <= e;
      const isStart = m == s;
      const isEnd = m == e;
      const radius = isStart && isEnd ? 'rounded-md' : isStart ? 'rounded-l-md' : isEnd ? 'rounded-r-md' : '';
      cells += `<td class="px-0 py-2 border-b border-outline-variant/5 ${m%6===0?'border-r border-outline-variant/10':''}" data-m="${m}">
        ${active ? `<div class="h-5 ${radius} shadow-sm" style="background:${row.color}; opacity:0.7"></div>` : ''}
      </td>`;
    }

    return `
      <tr class="gantt-row hover:bg-surface-container-lowest/50 transition-colors" data-wi="${row.wi}" data-aid="${row.act.id}">
        <td class="sticky left-0 z-10 bg-white px-4 py-2 border-b border-r border-outline-variant/15 text-xs">
          <div class="flex items-center gap-2 pl-4">
            <span class="material-symbols-outlined text-xs" style="color:${row.color}">${row.icon}</span>
            <span class="text-on-surface truncate max-w-[200px]">${esc(row.name)}</span>
          </div>
        </td>
        <td class="border-b border-outline-variant/15 px-0.5 py-1">
          <select class="gantt-start w-14 text-center text-[10px] px-1 py-1 rounded-lg border border-outline-variant/30 bg-white focus:border-primary outline-none" data-wi="${row.wi}" data-aid="${row.act.id}">${opts}</select>
        </td>
        <td class="border-b border-r border-outline-variant/15 px-0.5 py-1">
          <select class="gantt-end w-14 text-center text-[10px] px-1 py-1 rounded-lg border border-outline-variant/30 bg-white focus:border-primary outline-none" data-wi="${row.wi}" data-aid="${row.act.id}">${optsEnd}</select>
        </td>
        ${cells}
      </tr>`;
  }

  /* ── Parse date to month offset ────────────────────────────── */
  function monthFromDate(dateStr, cs) {
    if (!dateStr) return null;
    // Try to get project start from calculator
    let projStart = null;
    try {
      const ps = cs?.wps?.[0]?.activities?.[0]?.date_start;
      // Actually use the project start date if available
    } catch (e) {}

    // For now, try to parse act dates and compute approximate month
    // Activities store ISO dates like "2026-09-01"
    // We don't have reliable project start here, so use relative dates
    return null;
  }

  /* ── Bind events ───────────────────────────────────────────── */
  function bindEvents(cs, totalMonths) {
    container.querySelectorAll('.gantt-start, .gantt-end').forEach(sel => {
      sel.addEventListener('change', () => {
        const row = sel.closest('.gantt-row');
        const wi = parseInt(row.dataset.wi);
        const aid = parseInt(row.dataset.aid);
        const startSel = row.querySelector('.gantt-start');
        const endSel = row.querySelector('.gantt-end');
        const s = parseInt(startSel.value) || 0;
        const e = parseInt(endSel.value) || 0;

        // Auto-correct: if start > end, swap
        if (s && e && s > e) {
          endSel.value = s;
        }

        // Update the activity dates in calculator state
        const act = cs.wps[wi]?.activities?.find(a => a.id === aid);
        if (act) {
          act._gantt_start = parseInt(startSel.value) || null;
          act._gantt_end = parseInt(endSel.value) || null;
        }

        // Re-render bars for this row
        updateRowBars(row, parseInt(startSel.value)||0, parseInt(endSel.value)||0, wpColor(wi), totalMonths);
      });
    });
  }

  /* ── Update Gantt bars without full re-render ──────────────── */
  function updateRowBars(row, s, e, color, totalMonths) {
    const cells = row.querySelectorAll('td[data-m]');
    cells.forEach(td => {
      const m = parseInt(td.dataset.m);
      const active = s && e && m >= s && m <= e;
      const isStart = m === s;
      const isEnd = m === e;
      const radius = isStart && isEnd ? 'rounded-md' : isStart ? 'rounded-l-md' : isEnd ? 'rounded-r-md' : '';

      if (active) {
        td.innerHTML = `<div class="h-5 ${radius} shadow-sm" style="background:${color}; opacity:0.7"></div>`;
      } else {
        td.innerHTML = '';
      }
    });
  }

  return { render };
})();
