// Splits the all-in-one xlsx output into:
//  - erasmus_plus_2026_calls_clean.json  (only real call rows, ~129)
//  - erasmus_plus_2026_calls_notes.json  (the appendix rows with definitions/deadlines)
// And produces erasmus_plus_2026_calls_by_topic.json, an index keyed by Topic ID.
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls.json');
const all = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const isNote = r => !r['Topic ID 2026'] && !r['Manager']; // appendix rows have no topic + no manager
const calls = all.filter(r => !isNote(r));
const notes = all.filter(r => isNote(r));

const parseAmount = s => {
  if (s == null) return null;
  const m = String(s).replace(/[€,\s.]/g, '').match(/-?\d+/);
  return m ? Number(m[0]) : null;
};

// Enrich each call row with parsed numeric amount + tier + family slug
const TIERS = [
  { name: 'XS',  max: 60000 },
  { name: 'S',   max: 250000 },
  { name: 'M',   max: 600000 },
  { name: 'L',   max: 1500000 },
  { name: 'XL',  max: 4000000 },
  { name: 'XXL', max: Infinity },
];
const tierOf = n => n == null ? null : TIERS.find(t => n < t.max)?.name ?? 'XXL';

const enriched = calls.map(r => ({
  family: r['Family'],
  family_slug: r['Family']?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
  action_subline: r['Action / Sub-line'],
  topic_id: r['Topic ID 2026'],
  manager: r['Manager'],
  amount_text: r['Amount (EUR)'],
  amount_eur: parseAmount(r['Amount (EUR)']),
  amount_type: r['Amount Type'],
  duration: r['Duration'],
  funding_rate: r['EU Funding Rate'],
  tier: tierOf(parseAmount(r['Amount (EUR)'])),
  notes: r['Practical Implication / Notes'],
}));

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls_clean.json'),
  JSON.stringify(enriched, null, 2),
  'utf8'
);

// Index by Topic ID (one entry = one topic, with its budget variants under it)
const byTopic = {};
for (const r of enriched) {
  if (!byTopic[r.topic_id]) {
    byTopic[r.topic_id] = {
      topic_id: r.topic_id,
      family: r.family,
      manager: r.manager,
      duration: r.duration,
      funding_rate: r.funding_rate,
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

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls_by_topic.json'),
  JSON.stringify(byTopicArr, null, 2),
  'utf8'
);

fs.writeFileSync(
  path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls_notes.json'),
  JSON.stringify(notes.map(r => r['Family']).filter(Boolean), null, 2),
  'utf8'
);

console.log(`clean: ${enriched.length} call rows`);
console.log(`topics: ${byTopicArr.length} distinct topic IDs`);
console.log(`notes:  ${notes.length} appendix lines`);

// Print compact catalog summary by family
const byFamily = {};
for (const r of enriched) {
  if (!byFamily[r.family]) byFamily[r.family] = { topics: new Set(), variants: 0, min: Infinity, max: -Infinity, manager: r.manager };
  byFamily[r.family].topics.add(r.topic_id);
  byFamily[r.family].variants++;
  if (Number.isFinite(r.amount_eur)) {
    byFamily[r.family].min = Math.min(byFamily[r.family].min, r.amount_eur);
    byFamily[r.family].max = Math.max(byFamily[r.family].max, r.amount_eur);
  }
}
console.log('\nCatalog by Family:');
const fmt = n => Number.isFinite(n) ? '€' + n.toLocaleString() : '?';
for (const [f, v] of Object.entries(byFamily).sort((a, b) => b[1].variants - a[1].variants)) {
  console.log(`  [${v.manager?.padEnd(16) || '?'.padEnd(16)}] ${v.topics.size}T x ${v.variants}V  ${fmt(v.min)} – ${fmt(v.max)}  · ${f}`);
}
