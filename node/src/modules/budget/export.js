/* ── Budget Excel Export ─────────────────────────────────────────
   Fills the official EACEA Erasmus LSII template with project data.
   Uses direct XML/ZIP manipulation to preserve styles, shapes,
   validations, comments, drawings and formulas byte-for-byte.
   Template: /templates/budget_template_eacea.xlsx (12 BE × 8 WPs)
   ─────────────────────────────────────────────────────────────── */

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', '..', 'templates', 'budget_template_eacea.xlsx');

const WP_BLOCK_STARTS = [9, 43, 77, 111, 145, 179, 213, 247];

// Offsets from STARTWPxxx marker row, keyed by category|subcategory|line_item.
const LINE_MAP = {
  'A|A1|Project Coordinator': 3,
  'A|A1|Youth Trainer': 4,
  'A|A1|Finance Manager': 5,
  'A|A1|Communications Officer': 6,
  'A|A1|Other': 7,
  'A|A2|Natural persons under direct contract': 8,
  'A|A3|Seconded persons': 9,
  'A|A4|SME Owners without salary': 10,
  'A|A5|Volunteers': 11,
  'B||Subcontracting costs': 12,
  'C|C1|Travel': 15,
  'C|C1|Accommodation': 16,
  'C|C1|Subsistence': 17,
  'C|C2|Equipment': 18,
  'C|C3|Consumables': 20,
  'C|C3|Services for Meetings, Seminars': 21,
  'C|C3|Services for communication/promotion/dissemination': 22,
  'C|C3|Website': 23,
  'C|C3|Artistic Fees': 24,
  'C|C3|Other': 25,
  'D|D1|Financial support to third parties': 27,
};

const STAFF_TYPE_LABELS = [
  'Project Coordinator',
  'Youth Trainer',
  'Finance Manager',
  'Communications Officer',
  'Other',
];

/* ── Helpers ───────────────────────────────────────────────────── */

function colToNum(col) {
  let n = 0;
  for (const c of col) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellNum(addr, val) {
  return `<c r="${addr}"><v>${val}</v></c>`;
}

function cellStr(addr, val) {
  return `<c r="${addr}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(val)}</t></is></c>`;
}

/**
 * Patch a worksheet XML: for each (addr → cellXml), replace or insert the cell
 * within its row, keeping the row's other cells intact and in ascending order.
 */
function patchSheet(xml, edits) {
  // Group edits by row number
  const byRow = new Map();
  for (const [addr, cellXml] of edits) {
    const m = /^([A-Z]+)(\d+)$/.exec(addr);
    if (!m) continue;
    const col = m[1], rowNum = m[2];
    if (!byRow.has(rowNum)) byRow.set(rowNum, []);
    byRow.get(rowNum).push({ col, xml: cellXml });
  }

  for (const [rowNum, newCells] of byRow) {
    const rowRe = new RegExp(`<row\\s[^>]*\\br="${rowNum}"[^>]*>[\\s\\S]*?<\\/row>`);
    const match = xml.match(rowRe);
    if (!match) {
      // Row doesn't exist yet: insert a new <row> before </sheetData>.
      const cellsXml = newCells
        .slice()
        .sort((a, b) => colToNum(a.col) - colToNum(b.col))
        .map(c => c.xml)
        .join('');
      const newRow = `<row r="${rowNum}">${cellsXml}</row>`;
      xml = xml.replace('</sheetData>', newRow + '</sheetData>');
      continue;
    }

    const full = match[0];
    const openMatch = full.match(/^<row\s[^>]*>/);
    const openTag = openMatch[0];
    const closeTag = '</row>';
    const content = full.substring(openTag.length, full.length - closeTag.length);

    // Extract existing cells
    const cellRe = /<c\s+r="([A-Z]+)\d+"[^>]*(?:\/>|>[\s\S]*?<\/c>)/g;
    const existing = [];
    let cm;
    while ((cm = cellRe.exec(content))) {
      existing.push({ col: cm[1], xml: cm[0] });
    }

    // Drop any existing cell at the columns we're replacing
    const replaceSet = new Set(newCells.map(c => c.col));
    const kept = existing.filter(c => !replaceSet.has(c.col));

    // Merge and sort by column
    const merged = [...kept, ...newCells].sort(
      (a, b) => colToNum(a.col) - colToNum(b.col)
    );

    const newContent = merged.map(c => c.xml).join('');
    xml = xml.replace(full, openTag + newContent + closeTag);
  }

  return xml;
}

/**
 * Resolve sheet names → internal XML file paths via workbook rels.
 */
function buildSheetPathMap(workbookXml, relsXml) {
  const sheetNameToRid = new Map();
  for (const m of workbookXml.matchAll(/<sheet\b[^>]*\bname="([^"]+)"[^>]*\br:id="([^"]+)"/g)) {
    sheetNameToRid.set(m[1], m[2]);
  }
  const ridToTarget = new Map();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)) {
    ridToTarget.set(m[1], m[2]);
  }
  const out = new Map();
  for (const [name, rid] of sheetNameToRid) {
    const target = ridToTarget.get(rid);
    if (target) {
      const normalized = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
      out.set(name, normalized);
    }
  }
  return out;
}

/* ── Main export ───────────────────────────────────────────────── */

async function exportBudgetBuffer(fullBudget) {
  const tplBuf = fs.readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(tplBuf);

  const workbookXml = await zip.file('xl/workbook.xml').async('string');
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const sheetPathMap = buildSheetPathMap(workbookXml, relsXml);

  // Collect edits: Map<sheetPath, Map<addr, cellXml>>
  const editsBySheetPath = new Map();
  function addEdit(sheetName, addr, cellXml) {
    const sheetPath = sheetPathMap.get(sheetName);
    if (!sheetPath) return;
    if (!editsBySheetPath.has(sheetPath)) editsBySheetPath.set(sheetPath, new Map());
    editsBySheetPath.get(sheetPath).set(addr, cellXml);
  }

  const bens = (fullBudget.beneficiaries || []).slice(0, 12);
  const wps = (fullBudget.workPackages || []).slice(0, 8);

  // Beneficiaries List (rows 6-17)
  bens.forEach((b, i) => {
    const r = 6 + i;
    if (b.name) addEdit('Beneficiaries List', 'B' + r, cellStr('B' + r, b.name));
    if (b.acronym) addEdit('Beneficiaries List', 'C' + r, cellStr('C' + r, b.acronym));
    if (b.country) addEdit('Beneficiaries List', 'D' + r, cellStr('D' + r, b.country));
  });

  // Work Packages List (rows 6-13)
  wps.forEach((wp, i) => {
    const r = 6 + i;
    if (wp.label) addEdit('Work Packages List', 'B' + r, cellStr('B' + r, wp.label));
  });

  // Instructions: staff labels + grant + co-financing
  STAFF_TYPE_LABELS.forEach((lbl, i) => {
    addEdit('Instructions', 'C' + (45 + i), cellStr('C' + (45 + i), lbl));
  });
  const maxGrant = Number(fullBudget.budget?.max_grant || fullBudget.instructions?.max_grant || 0);
  if (maxGrant > 0) addEdit('Instructions', 'E34', cellNum('E34', maxGrant));
  const cofinPct = Number(fullBudget.budget?.cofin_pct || fullBudget.instructions?.cofin_pct || 0);
  if (cofinPct > 0) addEdit('Instructions', 'E35', cellNum('E35', cofinPct / 100));

  // BE sheets: fill R (units) and S (cost/unit) per cost line
  bens.forEach((ben, bi) => {
    const sheetName = 'BE ' + String(bi + 1).padStart(3, '0');
    wps.forEach((wp, wi) => {
      const startRow = WP_BLOCK_STARTS[wi];
      const costs = (fullBudget.costMap && fullBudget.costMap[ben.id + '|' + wp.id]) || [];
      for (const c of costs) {
        const key = [c.category, c.subcategory || '', c.line_item].join('|');
        const offset = LINE_MAP[key];
        if (offset == null) continue;
        const units = Number(c.units) || 0;
        const rate = Number(c.cost_per_unit) || 0;
        if (units === 0 && rate === 0) continue;
        const row = startRow + offset;
        addEdit(sheetName, 'R' + row, cellNum('R' + row, units));
        addEdit(sheetName, 'S' + row, cellNum('S' + row, rate));
      }
    });
  });

  // Apply all edits
  for (const [sheetPath, edits] of editsBySheetPath) {
    const xml = await zip.file(sheetPath).async('string');
    const newXml = patchSheet(xml, edits);
    zip.file(sheetPath, newXml);
  }

  // Drop cached calc chain so Excel recalculates on open.
  // Must also remove its references from [Content_Types].xml and workbook rels
  // or Excel flags the file as corrupted.
  if (zip.file('xl/calcChain.xml')) {
    zip.remove('xl/calcChain.xml');
    const ct = await zip.file('[Content_Types].xml').async('string');
    const newCt = ct.replace(/<Override\s+PartName="\/xl\/calcChain\.xml"[^>]*\/>/g, '');
    if (newCt !== ct) zip.file('[Content_Types].xml', newCt);
    const wbRelsPath = 'xl/_rels/workbook.xml.rels';
    const wbRels = await zip.file(wbRelsPath).async('string');
    const newRels = wbRels.replace(/<Relationship\b[^>]*\bTarget="calcChain\.xml"[^>]*\/>/g, '');
    if (newRels !== wbRels) zip.file(wbRelsPath, newRels);
  }

  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

module.exports = { exportBudgetBuffer, LINE_MAP, WP_BLOCK_STARTS };
