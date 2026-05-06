// Pricing v2 — piecewise regressive curve with absolute cap.
//
// Curve (marginal, IRPF-style):
//   0      –   800 000 €  →  1.0 %
//   800k   –  1 500 000 € →  0.7 % on excess
//   1.5M   –  3 000 000 € →  0.5 % on excess
//   3M     –  ∞            →  0.3 % on excess
//   Absolute cap: 25 000 €
//
// Above the cap the product is treated as Consultivo (individual contract,
// not a SaaS slot). Slots are flagged with `consultivo: true` when the raw
// piecewise calculation would exceed the cap.
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const calls = JSON.parse(fs.readFileSync(path.join(DATA, 'pricing_v1_one_percent.json'), 'utf8'));

const CAP = 25_000;
const computeSlotPrice = amount => {
  if (!Number.isFinite(amount) || amount <= 0) return { price: null, consultivo: false, raw: null };
  const brackets = [
    { upper:    800_000, rate: 0.010 },
    { upper:  1_500_000, rate: 0.007 },
    { upper:  3_000_000, rate: 0.005 },
    { upper: Infinity,   rate: 0.003 },
  ];
  let remaining = amount;
  let lower = 0;
  let raw = 0;
  for (const b of brackets) {
    if (remaining <= 0) break;
    const span = Math.min(remaining, b.upper - lower);
    raw += span * b.rate;
    remaining -= span;
    lower = b.upper;
  }
  const rounded = Math.round(raw);
  if (rounded > CAP) return { price: CAP, consultivo: true, raw: rounded };
  return { price: rounded, consultivo: false, raw: rounded };
};

const enriched = calls.map(c => {
  const { price, consultivo, raw } = computeSlotPrice(c.amount_eur);
  return {
    ...c,
    slot_price_eur_v1: c.slot_price_eur,
    slot_price_eur: price,
    slot_price_eur_raw: raw,
    consultivo,
    delta_v1_to_v2: price != null && c.slot_price_eur != null ? price - c.slot_price_eur : null,
  };
});

fs.writeFileSync(path.join(DATA, 'pricing_v2_regressive.json'), JSON.stringify(enriched, null, 2));

const cols = ['cohort','cohort_name','cohort_deadline','family','topic_id','action_subline','manager','amount_eur','tier','funding_rate','slot_price_eur_v1','slot_price_eur','consultivo','delta_v1_to_v2'];
const esc = v => v == null ? '' : (/[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
fs.writeFileSync(path.join(DATA, 'pricing_v2_regressive.csv'), [cols.join(','), ...enriched.map(r => cols.map(c => esc(r[c])).join(','))].join('\n'));

// === REPORT ===
console.log('═══ PRICING V2 — CURVA REGRESIVA + CAP 25.000€ ═══\n');

console.log('Verificación de puntos clave de la curva:');
[30_000, 60_000, 100_000, 200_000, 400_000, 500_000, 800_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000, 6_400_000].forEach(amt => {
  const r = computeSlotPrice(amt);
  const flag = r.consultivo ? ' (consultivo, raw=€'+r.raw.toLocaleString()+')' : '';
  console.log(`  €${amt.toLocaleString().padStart(11)} → slot €${r.price.toLocaleString().padStart(7)}${flag}`);
});

console.log('\nMatriz cohorte × tier (rango de slot_price_eur en v2):\n');
const matrix = {};
const cohorts = new Set();
for (const r of enriched) {
  cohorts.add(r.cohort);
  if (!matrix[r.cohort]) matrix[r.cohort] = {};
  if (!matrix[r.cohort][r.tier]) matrix[r.cohort][r.tier] = [];
  matrix[r.cohort][r.tier].push(r.slot_price_eur);
}
const allTiers = ['XS', 'S', 'M', 'L'];
console.log('  COHORTE              ' + allTiers.map(t => t.padStart(15)).join(''));
for (const c of cohorts) {
  const row = [c.slice(0, 18).padEnd(20)];
  for (const tier of allTiers) {
    const prices = matrix[c]?.[tier] || [];
    if (prices.length === 0) row.push('—'.padStart(15));
    else {
      const min = Math.min(...prices); const max = Math.max(...prices);
      const txt = min === max ? '€' + min.toLocaleString() : `€${(min/1000).toFixed(1)}k–${(max/1000).toFixed(1)}k`;
      row.push(txt.padStart(15));
    }
  }
  console.log(row.join(''));
}

console.log('\nCambios respecto a v1 (solo SKUs con cambio):');
for (const r of enriched.sort((a, b) => (b.amount_eur || 0) - (a.amount_eur || 0))) {
  if (r.delta_v1_to_v2 != null && r.delta_v1_to_v2 !== 0) {
    const sign = r.delta_v1_to_v2 > 0 ? '+' : '';
    const consultivo = r.consultivo ? ' [CONSULTIVO]' : '';
    console.log(`  ${r.topic_id.padEnd(40)} €${(r.amount_eur||0).toLocaleString().padStart(11)}  v1=€${r.slot_price_eur_v1.toLocaleString().padStart(6)}  →  v2=€${r.slot_price_eur.toLocaleString().padStart(6)}  (${sign}${r.delta_v1_to_v2.toLocaleString()})${consultivo}`);
  }
}

console.log('\nRecaudación potencial (mismo escenario que v1: 30 alumnos por cohorte ordinaria):');
const ASSUMED = 30;
const cohortRevenue = {};
for (const r of enriched) {
  if (!cohortRevenue[r.cohort]) cohortRevenue[r.cohort] = { name: r.cohort_name, prices: [], consultivo_count: 0 };
  cohortRevenue[r.cohort].prices.push(r.slot_price_eur);
  if (r.consultivo) cohortRevenue[r.cohort].consultivo_count++;
}
let total = 0;
for (const [k, v] of Object.entries(cohortRevenue)) {
  const avg = Math.round(v.prices.reduce((a,b)=>a+b,0) / v.prices.length);
  const rev = avg * ASSUMED;
  total += rev;
  const note = v.consultivo_count > 0 ? ` (${v.consultivo_count} SKUs en cap consultivo)` : '';
  console.log(`  ${k.padEnd(18)}  avg €${avg.toLocaleString().padStart(7)}  × ${ASSUMED} = €${rev.toLocaleString().padStart(9)}${note}`);
}
console.log(`\n  TOTAL temporada (12 cohortes × 30 alumnos): €${total.toLocaleString()}`);
console.log('  (Las cohortes consultivas en realidad tienen 5-10 clientes, no 30. Ver PRICING_FRAMEWORK.md para escenarios realistas.)');
