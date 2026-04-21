#!/usr/bin/env node
/**
 * enrichment-dashboard.js — build a self-contained HTML dashboard of the
 * entity_enrichment table so Oscar can review results in the browser.
 *
 * Output: tmp/enrichment-dashboard.html  (open with double-click)
 */

require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const pool = require('../node/src/utils/db');

async function main() {
  const [rows] = await pool.query(`SELECT * FROM entity_enrichment ORDER BY error_type IS NULL DESC, score_eu_readiness DESC, score_professionalism DESC`);

  // Parse JSON fields for easier reading
  for (const r of rows) {
    for (const k of ['emails', 'phones', 'addresses', 'website_languages', 'social_links', 'eu_programs', 'redirect_chain', 'staff_names', 'network_memberships']) {
      if (typeof r[k] === 'string') {
        try { r[k] = JSON.parse(r[k]); } catch {}
      }
    }
  }

  const outPath = path.resolve(__dirname, '..', 'tmp', 'enrichment-dashboard.html');
  const html = buildHtml(rows);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`Wrote ${outPath}  (${rows.length} rows)`);
  await pool.end();
}

function buildHtml(rows) {
  const payload = JSON.stringify(rows).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Entity Enrichment — review dashboard</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
  header { padding: 14px 20px; background: #1e293b; border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 10; }
  header h1 { margin: 0 0 8px; font-size: 18px; }
  .controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; font-size: 13px; }
  .controls input, .controls select { background: #0f172a; color: #e2e8f0; border: 1px solid #475569; padding: 5px 8px; border-radius: 4px; font-size: 13px; }
  .controls label { display: flex; gap: 6px; align-items: center; color: #94a3b8; }
  .stats { display: flex; gap: 16px; font-size: 12px; color: #94a3b8; flex-wrap: wrap; }
  .stats .pill { background: #334155; padding: 3px 8px; border-radius: 10px; color: #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead { background: #1e293b; position: sticky; top: 78px; }
  thead th { padding: 8px 10px; text-align: left; border-bottom: 1px solid #334155; cursor: pointer; user-select: none; white-space: nowrap; }
  thead th:hover { background: #334155; }
  thead th.sorted::after { content: ' ▼'; color: #38bdf8; font-size: 10px; }
  thead th.sorted.asc::after { content: ' ▲'; }
  tbody tr { border-bottom: 1px solid #1e293b; }
  tbody tr:hover { background: #1e293b; }
  tbody tr.row-err { opacity: 0.6; }
  td { padding: 6px 10px; vertical-align: top; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  td.wrap { white-space: normal; }
  .badge { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; }
  .b-ok { background: #065f46; color: #a7f3d0; }
  .b-err { background: #7f1d1d; color: #fecaca; }
  .b-warn { background: #78350f; color: #fde68a; }
  .b-neutral { background: #334155; color: #cbd5e1; }
  .score { display: inline-block; width: 34px; text-align: center; padding: 2px; border-radius: 3px; font-variant-numeric: tabular-nums; }
  .score.s-h { background: #14532d; color: #86efac; }
  .score.s-m { background: #713f12; color: #fde68a; }
  .score.s-l { background: #1e293b; color: #94a3b8; }
  .score.s-risk-h { background: #7f1d1d; color: #fecaca; }
  a { color: #38bdf8; }
  details { margin: 6px 0; }
  summary { cursor: pointer; color: #94a3b8; font-size: 11px; }
  .detail-row { background: #0b1220; padding: 10px 40px; font-size: 11px; white-space: pre-wrap; }
  .detail-grid { display: grid; grid-template-columns: 200px 1fr; gap: 4px 16px; }
  .detail-grid dt { color: #94a3b8; }
  .detail-grid dd { margin: 0; word-break: break-word; color: #e2e8f0; }
</style>
</head>
<body>
<header>
  <h1>Entity Enrichment — review of <span id="total"></span> entities</h1>
  <div class="controls">
    <label>Search <input id="search" type="search" placeholder="name, oid, domain..." size="28"></label>
    <label>Status
      <select id="f-status">
        <option value="">all</option>
        <option value="ok">ok only</option>
        <option value="error">errors only</option>
      </select>
    </label>
    <label>Error
      <select id="f-error"><option value="">any</option></select>
    </label>
    <label>Legal form
      <select id="f-legal"><option value="">any</option></select>
    </label>
    <label>CMS
      <select id="f-cms"><option value="">any</option></select>
    </label>
    <label>Min EU-ready <input id="f-eu" type="number" min="0" max="100" value="0" size="3"></label>
    <label>Max squat-risk <input id="f-sq" type="number" min="0" max="100" value="100" size="3"></label>
    <button id="reset">reset</button>
  </div>
  <div class="stats" id="stats"></div>
</header>
<table>
  <thead id="thead"></thead>
  <tbody id="tbody"></tbody>
</table>
<script>
const DATA = ${payload};

const COLS = [
  { key: 'oid',               label: 'OID',          w: 80 },
  { key: 'extracted_name',    label: 'Name',         w: 260 },
  { key: '_status',           label: 'Status',       w: 80, html: true },
  { key: 'error_type',        label: 'Error',        w: 130 },
  { key: 'legal_form',        label: 'Legal form',   w: 90 },
  { key: 'cms_detected',      label: 'CMS',          w: 110 },
  { key: 'score_professionalism', label: 'P',        w: 40, html: true, num: true },
  { key: 'score_eu_readiness', label: 'EU',          w: 40, html: true, num: true },
  { key: 'score_vitality',    label: 'V',            w: 40, html: true, num: true },
  { key: 'score_squat_risk',  label: 'SQ',           w: 40, html: true, num: true, risk: true },
  { key: 'mismatch_level',    label: 'Mismatch',     w: 100 },
  { key: '_has_email',        label: '@',            w: 40, num: true },
  { key: 'year_founded',      label: 'Since',        w: 60, num: true },
  { key: 'copyright_year',    label: '©',            w: 60, num: true },
  { key: 'final_url',         label: 'URL',          w: 220, html: true },
];

// Enrich rows with derived display fields
for (const r of DATA) {
  r._status = r.error_type ? 'ERROR' : 'OK';
  r._has_email = Array.isArray(r.emails) ? r.emails.length : 0;
  r._final_url_host = (() => { try { return new URL(r.final_url).hostname; } catch { return ''; } })();
  r._searchable = [r.oid, r.extracted_name, r.description, r._final_url_host, r.legal_form, r.cms_detected].filter(Boolean).join(' ').toLowerCase();
}

const state = { sort: { key: 'score_eu_readiness', dir: 'desc' } };

function scoreClass(v, risk=false) {
  if (v === null || v === undefined) return 's-l';
  if (risk) return v >= 60 ? 's-risk-h' : v >= 30 ? 's-m' : 's-l';
  return v >= 60 ? 's-h' : v >= 30 ? 's-m' : 's-l';
}

function render() {
  const q = document.getElementById('search').value.toLowerCase().trim();
  const fStatus = document.getElementById('f-status').value;
  const fError = document.getElementById('f-error').value;
  const fLegal = document.getElementById('f-legal').value;
  const fCms = document.getElementById('f-cms').value;
  const minEu = parseInt(document.getElementById('f-eu').value, 10) || 0;
  const maxSq = parseInt(document.getElementById('f-sq').value, 10) || 100;

  let filtered = DATA.filter(r => {
    if (fStatus === 'ok' && r.error_type) return false;
    if (fStatus === 'error' && !r.error_type) return false;
    if (fError && r.error_type !== fError) return false;
    if (fLegal && r.legal_form !== fLegal) return false;
    if (fCms && r.cms_detected !== fCms) return false;
    if ((r.score_eu_readiness || 0) < minEu) return false;
    if ((r.score_squat_risk || 0) > maxSq) return false;
    if (q && !r._searchable.includes(q)) return false;
    return true;
  });

  // Sort
  const { key, dir } = state.sort;
  filtered.sort((a, b) => {
    let av = a[key], bv = b[key];
    if (av === null || av === undefined) av = '';
    if (bv === null || bv === undefined) bv = '';
    if (typeof av === 'number' || typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av;
    return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  // Stats
  const total = DATA.length;
  const shown = filtered.length;
  const okCount = filtered.filter(r => !r.error_type).length;
  document.getElementById('total').textContent = total;
  document.getElementById('stats').innerHTML =
    '<span class="pill">Showing ' + shown + '/' + total + '</span>' +
    '<span class="pill">OK: ' + okCount + '</span>' +
    '<span class="pill">Errors: ' + (shown - okCount) + '</span>';

  // Table head
  const thead = document.getElementById('thead');
  thead.innerHTML = '<tr>' + COLS.map(c => {
    const sortedCls = state.sort.key === c.key ? ('sorted ' + (state.sort.dir === 'asc' ? 'asc' : 'desc')) : '';
    return '<th class="' + sortedCls + '" data-k="' + c.key + '">' + c.label + '</th>';
  }).join('') + '</tr>';
  thead.querySelectorAll('th').forEach(th => th.onclick = () => {
    const k = th.dataset.k;
    if (state.sort.key === k) state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
    else { state.sort.key = k; state.sort.dir = 'desc'; }
    render();
  });

  // Body
  const tbody = document.getElementById('tbody');
  const rowsHtml = filtered.map((r, i) => {
    const trCls = r.error_type ? 'row-err' : '';
    const cells = COLS.map(c => {
      let v = r[c.key];
      if (v === null || v === undefined) v = '';
      if (c.html) {
        if (c.key === '_status') {
          return '<td><span class="badge ' + (r.error_type ? 'b-err' : 'b-ok') + '">' + (r.error_type ? 'ERR' : 'OK') + '</span></td>';
        }
        if (c.key === 'final_url' && v) {
          const host = (()=>{ try { return new URL(v).hostname; } catch { return v; }})();
          return '<td><a href="' + v + '" target="_blank">' + host + '</a></td>';
        }
        if (c.num) {
          if (v === '' || v === null) return '<td></td>';
          return '<td><span class="score ' + scoreClass(v, !!c.risk) + '">' + v + '</span></td>';
        }
      }
      return '<td>' + String(v).replace(/</g, '&lt;') + '</td>';
    }).join('');
    const detail = buildDetail(r);
    return '<tr class="' + trCls + '" data-idx="' + i + '">' + cells + '</tr>' +
           '<tr class="detail" style="display:none"><td colspan="' + COLS.length + '" class="detail-row">' + detail + '</td></tr>';
  }).join('');
  tbody.innerHTML = rowsHtml;

  // Row click expands detail
  tbody.querySelectorAll('tr[data-idx]').forEach(tr => {
    tr.onclick = () => {
      const next = tr.nextElementSibling;
      if (next && next.classList.contains('detail')) {
        next.style.display = next.style.display === 'none' ? 'table-row' : 'none';
      }
    };
  });
}

function buildDetail(r) {
  const fields = [
    ['Description', r.description],
    ['Emails', Array.isArray(r.emails) ? r.emails.join(', ') : ''],
    ['Phones', Array.isArray(r.phones) ? r.phones.join(', ') : ''],
    ['Addresses', Array.isArray(r.addresses) ? r.addresses.join(' | ') : ''],
    ['Languages', Array.isArray(r.website_languages) ? r.website_languages.join(', ') : ''],
    ['Socials', r.social_links ? Object.entries(r.social_links).map(([k,v])=>k+'='+v).join(' · ') : ''],
    ['EU programs', Array.isArray(r.eu_programs) ? r.eu_programs.join(', ') : ''],
    ['VAT', r.vat_number],
    ['Tax ID', r.tax_id_national],
    ['OID on site', r.oid_erasmus_on_site],
    ['PIC on site', r.pic_on_site],
    ['Logo URL', r.logo_url],
    ['Students', r.students_count],
    ['Teachers', r.teachers_count],
    ['Redirect chain', Array.isArray(r.redirect_chain) ? r.redirect_chain.map(x=>x.url+' → '+x.location).join(' · ') : ''],
    ['Error message', r.error_message],
    ['Last fetched', r.last_fetched_at],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (fields.length === 0) return '<em>No additional details.</em>';
  return '<dl class="detail-grid">' + fields.map(([k, v]) =>
    '<dt>' + k + '</dt><dd>' + String(v).replace(/</g, '&lt;') + '</dd>').join('') + '</dl>';
}

function populateSelect(id, key) {
  const vals = [...new Set(DATA.map(r => r[key]).filter(Boolean))].sort();
  const el = document.getElementById(id);
  vals.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = v; el.appendChild(o); });
}
populateSelect('f-error', 'error_type');
populateSelect('f-legal', 'legal_form');
populateSelect('f-cms', 'cms_detected');

for (const id of ['search','f-status','f-error','f-legal','f-cms','f-eu','f-sq']) {
  document.getElementById(id).addEventListener('input', render);
}
document.getElementById('reset').onclick = () => {
  document.getElementById('search').value = '';
  document.getElementById('f-status').value = '';
  document.getElementById('f-error').value = '';
  document.getElementById('f-legal').value = '';
  document.getElementById('f-cms').value = '';
  document.getElementById('f-eu').value = '0';
  document.getElementById('f-sq').value = '100';
  render();
};
render();
</script>
</body>
</html>`;
}

main().catch((e) => { console.error(e); process.exit(1); });
