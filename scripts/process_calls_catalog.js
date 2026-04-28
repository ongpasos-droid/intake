// Generic processor for Erasmus+ catalogs.
// Usage: node scripts/process_calls_catalog.js [2026|2027]
// Reads data/erasmus_plus_<year>_calls.xlsx (or _calls_speculative.xlsx for 2027)
// Writes: <year>_calls.json, .csv, .clean.json, .by_topic.json, .notes.json,
//         .by_month.json, .by_deadline.json
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const year = process.argv[2] || '2026';
const DATA = path.join(__dirname, '..', 'data');

const SRC = year === '2027'
  ? path.join(DATA, 'erasmus_plus_2027_calls_speculative.xlsx')
  : path.join(DATA, 'erasmus_plus_2026_calls.xlsx');

const STEM = year === '2027' ? 'erasmus_plus_2027_calls_speculative' : 'erasmus_plus_2026_calls';

const wb = XLSX.readFile(SRC);
const sheet = wb.SheetNames[0];
const allRows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: null, raw: false });
console.log(`[${year}] Loaded ${allRows.length} rows from ${path.basename(SRC)}`);

// helpers
const parseAmount = s => {
  if (s == null) return null;
  const m = String(s).replace(/[€,\s.]/g, '').match(/-?\d+/);
  return m ? Number(m[0]) : null;
};

// Parse "5 March 2027 (speculative)" → ISO date
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const parseDeadline = s => {
  if (!s) return { iso: null, speculative: false, raw: s };
  const speculative = /speculative/i.test(s);
  const m = String(s).match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return { iso: null, speculative, raw: s };
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return { iso: null, speculative, raw: s };
  const iso = `${m[3]}-${String(month).padStart(2, '0')}-${String(parseInt(m[1], 10)).padStart(2, '0')}`;
  return { iso, speculative, raw: s };
};

const TIERS = [
  { n: 'XS', max: 60000 },
  { n: 'S',  max: 500000 },
  { n: 'M',  max: 1500000 },
  { n: 'L',  max: Infinity },
];
const tierOf = n => n == null ? null : TIERS.find(t => n < t.max)?.n ?? 'L';

// Find which key holds the deadline column (varies between sheets)
const deadlineKey = allRows[0] ? Object.keys(allRows[0]).find(k => /deadline/i.test(k)) : null;
const topicIdKey = allRows[0] ? Object.keys(allRows[0]).find(k => /topic\s*id/i.test(k)) : null;
console.log(`Deadline column: ${deadlineKey || '(none)'}`);
console.log(`Topic ID column: ${topicIdKey}`);

// Notes: rows with empty Manager AND empty Topic ID
const isNote = r => !r['Manager'] && !r[topicIdKey];
const calls = allRows.filter(r => !isNote(r));
const notes = allRows.filter(r => isNote(r));

// Enrich
const enriched = calls.map(r => {
  const amt = parseAmount(r['Amount (EUR)']);
  const dl = deadlineKey ? parseDeadline(r[deadlineKey]) : { iso: null, speculative: null, raw: null };
  return {
    year: parseInt(year, 10),
    family: r['Family'],
    family_slug: r['Family']?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    action_subline: r['Action / Sub-line'],
    topic_id: r[topicIdKey],
    manager: r['Manager'],
    amount_text: r['Amount (EUR)'],
    amount_eur: amt,
    amount_type: r['Amount Type'],
    duration: r['Duration'],
    funding_rate: r['EU Funding Rate'],
    tier: tierOf(amt),
    deadline_iso: dl.iso,
    deadline_speculative: dl.speculative,
    deadline_raw: dl.raw,
    notes: r['Practical Implication / Notes'],
  };
});

// Write base outputs
fs.writeFileSync(path.join(DATA, `${STEM}.json`), JSON.stringify(allRows, null, 2));
const cols = Object.keys(allRows[0] || {});
const esc = v => v == null ? '' : (/[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
fs.writeFileSync(path.join(DATA, `${STEM}.csv`), [cols.join(','), ...allRows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n'));
fs.writeFileSync(path.join(DATA, `${STEM}.clean.json`), JSON.stringify(enriched, null, 2));
fs.writeFileSync(path.join(DATA, `${STEM}.notes.json`), JSON.stringify(notes.map(r => r['Family']).filter(Boolean), null, 2));

// Group by topic
const byTopic = {};
for (const r of enriched) {
  if (!byTopic[r.topic_id]) {
    byTopic[r.topic_id] = {
      topic_id: r.topic_id,
      family: r.family,
      manager: r.manager,
      duration: r.duration,
      funding_rate: r.funding_rate,
      deadline_iso: r.deadline_iso,
      deadline_speculative: r.deadline_speculative,
      action_sublines: new Set(),
      variants: [],
    };
  }
  byTopic[r.topic_id].action_sublines.add(r.action_subline);
  byTopic[r.topic_id].variants.push({
    action_subline: r.action_subline,
    amount_text: r.amount_text,
    amount_eur: r.amount_eur,
    amount_type: r.amount_type,
    tier: r.tier,
    notes: r.notes,
  });
}
const byTopicArr = Object.values(byTopic).map(t => ({
  ...t,
  action_sublines: [...t.action_sublines],
  variant_count: t.variants.length,
  amount_min: Math.min(...t.variants.map(v => v.amount_eur).filter(Number.isFinite)),
  amount_max: Math.max(...t.variants.map(v => v.amount_eur).filter(Number.isFinite)),
}));
fs.writeFileSync(path.join(DATA, `${STEM}.by_topic.json`), JSON.stringify(byTopicArr, null, 2));

// Group by deadline month (only if deadlines exist)
if (deadlineKey) {
  const byMonth = {};
  for (const t of byTopicArr) {
    if (!t.deadline_iso) continue;
    const ym = t.deadline_iso.slice(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push({
      topic_id: t.topic_id,
      family: t.family,
      manager: t.manager,
      deadline_iso: t.deadline_iso,
      speculative: t.deadline_speculative,
      variant_count: t.variant_count,
      amount_min: t.amount_min,
      amount_max: t.amount_max,
    });
  }
  const byMonthSorted = Object.fromEntries(
    Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
  );
  fs.writeFileSync(path.join(DATA, `${STEM}.by_month.json`), JSON.stringify(byMonthSorted, null, 2));
}

console.log(`\n[${year}] OUTPUTS`);
console.log(`  ${STEM}.json          ${allRows.length} rows`);
console.log(`  ${STEM}.clean.json    ${enriched.length} call SKUs`);
console.log(`  ${STEM}.by_topic.json ${byTopicArr.length} topics`);
console.log(`  ${STEM}.notes.json    ${notes.length} appendix lines`);
if (deadlineKey) console.log(`  ${STEM}.by_month.json calendar view`);

// Summary
console.log(`\n[${year}] CATALOG SUMMARY`);
const byFamily = {};
for (const r of enriched) {
  if (!byFamily[r.family]) byFamily[r.family] = { topics: new Set(), variants: 0, min: Infinity, max: -Infinity, manager: r.manager, deadlines: new Set() };
  byFamily[r.family].topics.add(r.topic_id);
  byFamily[r.family].variants++;
  if (r.deadline_iso) byFamily[r.family].deadlines.add(r.deadline_iso);
  if (Number.isFinite(r.amount_eur)) {
    byFamily[r.family].min = Math.min(byFamily[r.family].min, r.amount_eur);
    byFamily[r.family].max = Math.max(byFamily[r.family].max, r.amount_eur);
  }
}
const fmt = n => Number.isFinite(n) ? '€' + n.toLocaleString() : '?';
for (const [f, v] of Object.entries(byFamily).sort((a, b) => b[1].variants - a[1].variants)) {
  const dls = [...v.deadlines].sort().join(' / ') || '-';
  console.log(`  [${(v.manager || '?').slice(0, 5).padEnd(5)}] ${v.topics.size}T x ${v.variants}V  ${fmt(v.min)} – ${fmt(v.max)}  ⏰ ${dls}  · ${f}`);
}

// Tier histogram
const tiers = {};
for (const r of enriched) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
console.log(`\n[${year}] TIER DISTRIBUTION`);
for (const t of TIERS.map(t => t.n)) {
  const c = tiers[t] || 0;
  const pct = ((c / enriched.length) * 100).toFixed(1);
  console.log(`  ${t.padEnd(3)}  ${c.toString().padStart(3)} SKUs  ${pct}%`);
}
