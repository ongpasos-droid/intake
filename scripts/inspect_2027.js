// Quick inspection of 2027 xlsx to see if columns differ from 2026
const path = require('path');
const XLSX = require('xlsx');

const SRC = path.join(__dirname, '..', 'data', 'erasmus_plus_2027_calls_speculative.xlsx');
const wb = XLSX.readFile(SRC);
console.log('Sheets:', wb.SheetNames);

for (const sheet of wb.SheetNames) {
  const ws = wb.Sheets[sheet];
  const json = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
  console.log(`\n--- Sheet "${sheet}" — ${json.length} rows ---`);
  if (json[0]) {
    console.log('Columns:', Object.keys(json[0]));
    console.log('\nFirst 3 rows:');
    for (let i = 0; i < Math.min(3, json.length); i++) {
      console.log(JSON.stringify(json[i], null, 2));
    }
  }
}
