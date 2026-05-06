// Generates pricing matrix v1 — slot price = 1% of project budget amount.
// Inputs: data/erasmus_plus_2027_calls_speculative.clean.json
// Outputs:
//   data/pricing_v1_one_percent.json   (per-SKU prices + cohort assignment)
//   data/pricing_v1_one_percent.csv    (tabular version)
//   data/cohorts_v1.json               (10-12 pedagogical cohorts with deadlines)
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const calls = JSON.parse(fs.readFileSync(path.join(DATA, 'erasmus_plus_2027_calls_speculative.clean.json'), 'utf8'));

// Cohort assignment rules — derived from "the guides define cohorts" + same calendar
const COHORTS = {
  CBHE:                 { topics_match: t => t.startsWith('ERASMUS-EDU-2027-CBHE-'),     name: 'CBHE — Capacity Building Higher Education',          deadline: '2027-02-10' },
  CB_YOUTH_EYT:         { topics_match: t => /YOUTH-2027-CB|YOUTH-TOG/.test(t),          name: 'Capacity Building Youth + KA3 EYT',                  deadline: '2027-02-26' },
  CB_VET:               { topics_match: t => t.includes('CB-VET'),                       name: 'Capacity Building VET',                              deadline: '2027-03-26' },
  KA2_COOP_SS_NA:       { topics_match: t => /^KA22[0]|^KA210/.test(t) || /PCOOP-ENGO/.test(t), name: 'KA2 Cooperation & Small-Scale + ENGO',          deadline: '2027-03-05' },
  SPORT_COOP_CAP:       { topics_match: t => /SPORT-2027-(CB|SCP|SSCP)$/.test(t),        name: 'Sport Cooperation & Capacity',                       deadline: '2027-03-05' },
  SPORT_EVENTS:         { topics_match: t => /SPORT-2027-(SNCESE|LSSNCESE)/.test(t),     name: 'Sport Events',                                       deadline: '2027-01-22' },
  AOI:                  { topics_match: t => t.includes('PI-ALL-INNO'),                  name: 'Alliances for Innovation (3 lots)',                  deadline: '2027-03-10' },
  EMJM:                 { topics_match: t => /EMJM/.test(t),                              name: 'Erasmus Mundus Joint Masters (Mob + Design)',        deadline: '2027-02-11' },
  TEACHER_ACA:          { topics_match: t => /TEACH-ACA/.test(t),                         name: 'Teacher Academies',                                  deadline: '2027-03-26' },
  EPSD:                 { topics_match: t => t.startsWith('KA240-SCH'),                  name: 'EPSD (KA240-SCH, nuevo 2026)',                       deadline: '2027-04-09' },
  COVE:                 { topics_match: t => /PEX-COVE/.test(t),                          name: 'CoVE (calendario propio septiembre)',                deadline: '2027-09-03' },
  EUR_UNIV:             { topics_match: t => /EUR-UNIV/.test(t),                          name: 'European Universities (consultivo, ticket muy alto)',deadline: 'varía' },
};

const assignCohort = topic => {
  for (const [key, c] of Object.entries(COHORTS)) {
    if (c.topics_match(topic)) return key;
  }
  return 'UNASSIGNED';
};

const RATE = 0.01; // 1% lineal del amount

const enriched = calls.map(c => {
  const cohort = assignCohort(c.topic_id);
  const slotPrice = c.amount_eur ? Math.round(c.amount_eur * RATE) : null;
  return {
    cohort,
    cohort_name: COHORTS[cohort]?.name || '?',
    cohort_deadline: COHORTS[cohort]?.deadline || c.deadline_iso,
    family: c.family,
    topic_id: c.topic_id,
    action_subline: c.action_subline,
    manager: c.manager,
    amount_eur: c.amount_eur,
    amount_text: c.amount_text,
    tier: c.tier,
    funding_rate: c.funding_rate,
    duration: c.duration,
    deadline_iso: c.deadline_iso,
    slot_price_eur: slotPrice,
    slot_price_text: slotPrice ? '€' + slotPrice.toLocaleString() : '?',
  };
});

fs.writeFileSync(path.join(DATA, 'pricing_v1_one_percent.json'), JSON.stringify(enriched, null, 2));

// CSV
const cols = ['cohort', 'cohort_name', 'cohort_deadline', 'family', 'topic_id', 'action_subline', 'manager', 'amount_eur', 'tier', 'funding_rate', 'duration', 'slot_price_eur'];
const esc = v => v == null ? '' : (/[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
fs.writeFileSync(
  path.join(DATA, 'pricing_v1_one_percent.csv'),
  [cols.join(','), ...enriched.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
);

// Cohort summary file
const cohortSummary = {};
for (const r of enriched) {
  if (!cohortSummary[r.cohort]) {
    cohortSummary[r.cohort] = {
      key: r.cohort,
      name: r.cohort_name,
      deadline: r.cohort_deadline,
      topics: new Set(),
      sku_count: 0,
      managers: new Set(),
      amount_min: Infinity,
      amount_max: -Infinity,
      slot_price_min: Infinity,
      slot_price_max: -Infinity,
      sample_amounts: [],
    };
  }
  const s = cohortSummary[r.cohort];
  s.topics.add(r.topic_id);
  s.sku_count++;
  s.managers.add(r.manager);
  if (Number.isFinite(r.amount_eur)) {
    s.amount_min = Math.min(s.amount_min, r.amount_eur);
    s.amount_max = Math.max(s.amount_max, r.amount_eur);
  }
  if (Number.isFinite(r.slot_price_eur)) {
    s.slot_price_min = Math.min(s.slot_price_min, r.slot_price_eur);
    s.slot_price_max = Math.max(s.slot_price_max, r.slot_price_eur);
  }
}
const cohortArr = Object.values(cohortSummary).map(s => ({
  ...s,
  topics: [...s.topics],
  topic_count: s.topics.size,
  managers: [...s.managers],
}));
fs.writeFileSync(path.join(DATA, 'cohorts_v1.json'), JSON.stringify(cohortArr, null, 2));

// Print summary
console.log(`SKUs procesados: ${enriched.length}`);
console.log(`Cohortes asignadas: ${cohortArr.length}\n`);
console.log('═══ COHORTES PEDAGÓGICAS ═══\n');
for (const c of cohortArr.sort((a, b) => (a.deadline || 'z').localeCompare(b.deadline || 'z'))) {
  const pmin = '€' + (c.slot_price_min || 0).toLocaleString();
  const pmax = '€' + (c.slot_price_max || 0).toLocaleString();
  const amin = '€' + (c.amount_min || 0).toLocaleString();
  const amax = '€' + (c.amount_max || 0).toLocaleString();
  console.log(`  ${(c.deadline || '?').padEnd(11)} ${c.key.padEnd(18)} ${c.topic_count}T × ${c.sku_count}SKU`);
  console.log(`              budget ${amin} – ${amax}`);
  console.log(`              slot   ${pmin} – ${pmax}`);
  console.log(`              ${c.name}\n`);
}

const unassigned = enriched.filter(r => r.cohort === 'UNASSIGNED');
if (unassigned.length) {
  console.log(`\n⚠ ${unassigned.length} SKUs sin asignar a cohorte:`);
  for (const r of unassigned) console.log(`  ${r.topic_id} · ${r.family}`);
}

// Tier × cohort matrix print
console.log('\n═══ MATRIZ COHORTE × TIER (precio mínimo–máximo del slot) ═══\n');
const matrix = {};
for (const r of enriched) {
  if (!matrix[r.cohort]) matrix[r.cohort] = {};
  if (!matrix[r.cohort][r.tier]) matrix[r.cohort][r.tier] = [];
  matrix[r.cohort][r.tier].push(r.slot_price_eur);
}
const allTiers = ['XS', 'S', 'M', 'L'];
console.log('  COHORTE'.padEnd(20) + allTiers.map(t => t.padStart(15)).join(''));
for (const c of cohortArr.sort((a, b) => (a.deadline || 'z').localeCompare(b.deadline || 'z'))) {
  const row = [c.key.slice(0, 18).padEnd(20)];
  for (const tier of allTiers) {
    const prices = matrix[c.key]?.[tier] || [];
    if (prices.length === 0) {
      row.push('—'.padStart(15));
    } else {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const txt = min === max ? '€' + min.toLocaleString() : `€${(min/1000).toFixed(1)}k–${(max/1000).toFixed(1)}k`;
      row.push(txt.padStart(15));
    }
  }
  console.log(row.join(''));
}

// Implications: average revenue per cohort
console.log('\n═══ FACTURACIÓN POTENCIAL POR COHORTE (asumiendo 30 alumnos/cohorte, slot promedio dentro de la cohorte) ═══\n');
const ASSUMED = 30;
let totalRevenue = 0;
for (const c of cohortArr.sort((a, b) => (a.deadline || 'z').localeCompare(b.deadline || 'z'))) {
  const prices = enriched.filter(r => r.cohort === c.key).map(r => r.slot_price_eur).filter(Number.isFinite);
  const avgPrice = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0) / prices.length) : 0;
  const revenue = avgPrice * ASSUMED;
  totalRevenue += revenue;
  console.log(`  ${c.key.padEnd(18)}  avg slot €${avgPrice.toLocaleString().padStart(7)}  × ${ASSUMED} alumnos = €${revenue.toLocaleString().padStart(9)}`);
}
console.log(`\n  TOTAL temporada (10-12 cohortes × 30 alumnos × slot avg): €${totalRevenue.toLocaleString()}`);
