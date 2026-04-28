// One-shot parser: reads data/erasmus_plus_2026_calls.xlsx and writes
// a normalized JSON + CSV next to it. Also prints structure summary to stdout.
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const SRC = path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls.xlsx');
const OUT_JSON = path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls.json');
const OUT_CSV = path.join(__dirname, '..', 'data', 'erasmus_plus_2026_calls.csv');

const wb = XLSX.readFile(SRC);

console.log('Sheets:', wb.SheetNames);

const allRows = [];
for (const sheet of wb.SheetNames) {
  const ws = wb.Sheets[sheet];
  const json = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  console.log(`\n--- Sheet "${sheet}" — ${json.length} rows ---`);
  if (json[0]) console.log('Columns:', Object.keys(json[0]));
  if (json[0]) console.log('First row:', JSON.stringify(json[0], null, 2));
  if (json[1]) console.log('Second row:', JSON.stringify(json[1], null, 2));
  for (const r of json) allRows.push({ _sheet: sheet, ...r });
}

fs.writeFileSync(OUT_JSON, JSON.stringify(allRows, null, 2), 'utf8');
console.log(`\nWrote JSON: ${OUT_JSON} (${allRows.length} rows)`);

if (allRows.length) {
  const cols = Object.keys(allRows[0]);
  const esc = v => v == null ? '' : (/[",\n;]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
  const csv = [cols.join(','), ...allRows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  fs.writeFileSync(OUT_CSV, csv, 'utf8');
  console.log(`Wrote CSV:  ${OUT_CSV}`);
}
