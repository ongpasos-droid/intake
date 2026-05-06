// Explore how 129 SKUs fall into different tier groupings (3 vs 4 tiers)
const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls_clean.json'), 'utf8'));

const cuts = {
  '4-tier-balanced': [
    { n: 'S',  max: 100000  },
    { n: 'M',  max: 500000  },
    { n: 'L',  max: 1500000 },
    { n: 'XL', max: Infinity },
  ],
  '4-tier-roundnumbers': [
    { n: 'S',  max: 100000  },
    { n: 'M',  max: 600000  },
    { n: 'L',  max: 2000000 },
    { n: 'XL', max: Infinity },
  ],
  '3-tier-simple': [
    { n: 'S',  max: 250000  },
    { n: 'M',  max: 1500000 },
    { n: 'L',  max: Infinity },
  ],
  '4-tier-asym': [
    { n: 'XS', max: 60000   }, // KA210 + Sport SSCP only
    { n: 'S',  max: 500000  },
    { n: 'M',  max: 1500000 },
    { n: 'L',  max: Infinity },
  ],
};

const tierOf = (n, tiers) => tiers.find(t => n < t.max)?.n ?? tiers[tiers.length - 1].n;

for (const [name, tiers] of Object.entries(cuts)) {
  console.log(`\n## ${name}`);
  const counts = {};
  const families = {};
  for (const r of data) {
    const t = tierOf(r.amount_eur, tiers);
    counts[t] = (counts[t] || 0) + 1;
    if (!families[t]) families[t] = new Set();
    families[t].add(r.family);
  }
  for (const t of tiers) {
    const cap = t.max === Infinity ? '∞' : '€' + t.max.toLocaleString();
    const c = counts[t.n] || 0;
    const pct = ((c / data.length) * 100).toFixed(1);
    const fams = [...(families[t.n] || [])].slice(0, 4).join(' · ') + ((families[t.n]?.size || 0) > 4 ? '...' : '');
    console.log(`  ${t.n.padEnd(3)}  <${cap.padStart(13)}   ${c.toString().padStart(3)} SKUs  ${pct.padStart(5)}%   ${fams}`);
  }
}

// For the recommended 4-tier-asym, list each tier's content in detail
console.log('\n\n======= DETAIL: 4-tier-asym (recomendada) =======\n');
const recommended = cuts['4-tier-asym'];
const byTier = { XS: [], S: [], M: [], L: [] };
for (const r of data) {
  byTier[tierOf(r.amount_eur, recommended)].push(r);
}
for (const [tName, rows] of Object.entries(byTier)) {
  console.log(`\n--- Tier ${tName} (${rows.length} SKUs) ---`);
  // Group by topic_id within the tier
  const byTopic = {};
  for (const r of rows) {
    if (!byTopic[r.topic_id]) byTopic[r.topic_id] = { family: r.family, manager: r.manager, amounts: [] };
    byTopic[r.topic_id].amounts.push(r.amount_eur);
  }
  for (const [topic, info] of Object.entries(byTopic)) {
    const amts = info.amounts.sort((a, b) => a - b).map(n => '€' + n.toLocaleString()).join(' · ');
    console.log(`  [${info.manager?.slice(0, 5).padEnd(5)}] ${topic.padEnd(40)} ${amts}  (${info.family})`);
  }
}
