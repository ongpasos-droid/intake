// Analytical pass over data/erasmus_plus_2026_calls.json — prints summary stats
const path = require('path');
const fs = require('fs');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls.json'), 'utf8'));
console.log(`Total rows: ${data.length}`);

const parseAmount = s => {
  if (s == null) return null;
  const m = String(s).replace(/[€,\s.]/g, '').match(/-?\d+/);
  return m ? Number(m[0]) : null;
};

const stats = (label, key) => {
  const counts = new Map();
  for (const r of data) {
    const v = r[key] || '(empty)';
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\n## ${label} — ${counts.size} distinct values`);
  for (const [v, c] of sorted) console.log(`  ${c.toString().padStart(4)} · ${v}`);
};

stats('Families', 'Family');
stats('Managers', 'Manager');
stats('Amount Type', 'Amount Type');
stats('EU Funding Rate', 'EU Funding Rate');
stats('Duration', 'Duration');

const amounts = data.map(r => parseAmount(r['Amount (EUR)'])).filter(Boolean).sort((a, b) => a - b);
console.log(`\n## Amounts — ${amounts.length} numeric values`);
console.log(`  min=${amounts[0].toLocaleString()}  max=${amounts.at(-1).toLocaleString()}`);
console.log(`  median=${amounts[Math.floor(amounts.length / 2)].toLocaleString()}`);

const buckets = [
  ['XS  <60k     ', x => x < 60000],
  ['S   60-250k  ', x => x >= 60000 && x < 250000],
  ['M   250-600k ', x => x >= 250000 && x < 600000],
  ['L   600k-1.5M', x => x >= 600000 && x < 1500000],
  ['XL  1.5M-4M  ', x => x >= 1500000 && x < 4000000],
  ['XXL 4M+      ', x => x >= 4000000],
];
console.log('\n## Distribution by tier (5-tier proposal from previous turn)');
for (const [label, fn] of buckets) {
  const n = amounts.filter(fn).length;
  console.log(`  ${label}  ${n.toString().padStart(4)}`);
}

// Group by Family + count amount variants
const familyVariants = new Map();
for (const r of data) {
  const f = r['Family'];
  if (!familyVariants.has(f)) familyVariants.set(f, new Set());
  familyVariants.get(f).add(r['Amount (EUR)']);
}
console.log(`\n## Amount variants per Family (${familyVariants.size} families)`);
for (const [f, vs] of [...familyVariants.entries()].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`  ${vs.size.toString().padStart(2)} variants · ${f}`);
}

// Distinct Topic IDs (a project type)
const topicIds = new Map();
for (const r of data) {
  const t = r['Topic ID 2026'] || '(empty)';
  if (!topicIds.has(t)) topicIds.set(t, []);
  topicIds.get(t).push(r);
}
console.log(`\n## Distinct Topic IDs: ${topicIds.size}`);
for (const [t, rows] of [...topicIds.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
  const family = rows[0]['Family'];
  const manager = rows[0]['Manager'];
  console.log(`  ${rows.length.toString().padStart(3)} rows · ${t}  [${manager}]  ${family}`);
}
