/* ═══════════════════════════════════════════════════════════════
   Parse Form Part B (DOCX) — Deterministic extraction by tags
   Uses mammoth for DOCX → HTML, then parses tags + tables
   ═══════════════════════════════════════════════════════════════ */

const mammoth = require('mammoth');

// Section tags in the official EACEA template
const SECTION_TAGS = [
  { tag: 'PRJ-SUM-PS',     key: 'project_summary',   title: 'Project Summary' },
  { tag: 'REL-EVA-RE',     key: 'sec_1',              title: '1. Relevance' },
  { tag: 'PRJ-OBJ-PO',     key: 'sec_1_sub',          title: '1. Relevance (sub)' },
  { tag: 'COM-PLE-CP',     key: 'sec_1_3',            title: '1.3 Complementarity' },
  { tag: 'CON-MET-CM',     key: 'sec_2_1_1',          title: '2.1.1 Concept and methodology' },
  { tag: 'PRJ-MGT-PM',     key: 'sec_2_1_2',          title: '2.1.2 Project management' },
  { tag: 'CON-SOR-CS',     key: 'sec_2_1_3_staff',    title: '2.1.3 Staff', occurrence: 1 },
  { tag: 'CON-SOR-CS',     key: 'sec_2_2',            title: '2.2 Consortium', occurrence: 2 },
  { tag: 'FIN-MGT-FM',     key: 'sec_2_1_4',          title: '2.1.4 Cost effectiveness' },
  { tag: 'RSK-MGT-RM',     key: 'sec_2_1_5',          title: '2.1.5 Risk management' },
  { tag: 'IMP-ACT-IA',     key: 'sec_3_1',            title: '3.1 Impact and ambition' },
  { tag: 'COM-DIS-VIS-CDV',key: 'sec_3_2',            title: '3.2 Communication and dissemination' },
  { tag: 'SUS-CON-SC',     key: 'sec_3_3',            title: '3.3 Sustainability' },
  { tag: 'WRK-PLA-WP',     key: 'sec_4',              title: '4. Work Plan' },
  { tag: 'ETH-ICS-EI',     key: 'sec_5_1',            title: '5.1 Ethics' },
  { tag: 'SEC-URI-SU',     key: 'sec_5_2',            title: '5.2 Security' },
  { tag: 'DEC-LAR-DL',     key: 'sec_6',              title: '6. Declarations' },
];

/**
 * Parse a DOCX Form Part B buffer into structured data
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Object} { cover, sections, tables, raw }
 */
async function parseFormB(buffer) {
  // Extract both raw text (for tags) and HTML (for tables)
  const [textResult, htmlResult] = await Promise.all([
    mammoth.extractRawText({ buffer }),
    mammoth.convertToHtml({ buffer }),
  ]);

  const text = textResult.value;
  const html = htmlResult.value;

  const result = {
    cover: extractCover(html),
    sections: {},
    tables: extractAllTables(html),
    work_packages: [],
  };

  // Extract sections by tags using HTML (preserves numbered lists)
  for (const { tag, key, occurrence } of SECTION_TAGS) {
    const open = `#@${tag}@#`;
    const close = `#§${tag}§#`;
    const targetOccurrence = occurrence || 1;

    // Search in HTML for tag positions
    let searchPos = 0;
    let start = -1, end = -1;
    for (let n = 0; n < targetOccurrence; n++) {
      start = html.indexOf(open, searchPos);
      if (start < 0) break;
      end = html.indexOf(close, start + open.length);
      if (end < 0) break;
      searchPos = end + close.length;
    }

    if (start >= 0 && end >= 0 && end > start) {
      let sectionHtml = html.substring(start + open.length, end).trim();
      // Remove nested tags
      sectionHtml = sectionHtml.replace(/#[@§][A-Z-]+[@§]#/g, '');
      // Convert HTML to clean text preserving numbered lists
      let content = htmlToText(sectionHtml);
      content = cleanContent(content);
      result.sections[key] = content;
    }
  }

  // Split compound sections BEFORE they were cleaned (use raw text for split markers)
  // sec_2_2 contains 2.2.1 (Consortium set-up) + 2.2.2 (Consortium management)
  if (result.sections['sec_2_2']) {
    // Re-extract raw from HTML to find the split point
    const sec22Start = html.indexOf('#@CON-SOR-CS@#', html.indexOf('#@CON-SOR-CS@#') + 10); // 2nd occurrence
    const sec22End = html.indexOf('#\u00A7CON-SOR-CS\u00A7#', sec22Start) >= 0
      ? html.indexOf('#\u00A7CON-SOR-CS\u00A7#', sec22Start)
      : html.indexOf('#§CON-SOR-CS§#', sec22Start);
    if (sec22Start >= 0 && sec22End > sec22Start) {
      const rawHtml = html.substring(sec22Start, sec22End);
      const rawText = htmlToText(rawHtml);
      const mgmtIdx = rawText.search(/CONSORTIUM MANAGEMENT/i);
      if (mgmtIdx > 0) {
        result.sections['sec_2_2_1'] = cleanTags(cleanContent(rawText.substring(0, mgmtIdx).trim()));
        result.sections['sec_2_2_2'] = cleanTags(cleanContent(rawText.substring(mgmtIdx).trim()));
      }
    }
  }

  // sec_1 contains 1.1 + 1.2; split by "Needs analysis" heading
  if (result.sections['sec_1']) {
    const sec1Start = html.indexOf('#@REL-EVA-RE@#');
    const sec1End = html.indexOf('#§REL-EVA-RE§#');
    if (sec1Start >= 0 && sec1End > sec1Start) {
      const rawText = htmlToText(html.substring(sec1Start, sec1End));
      const needsIdx = rawText.search(/Needs analysis/i);
      if (needsIdx > 0) {
        result.sections['sec_1_1'] = cleanTags(cleanContent(rawText.substring(0, needsIdx).trim()));
        result.sections['sec_1_2'] = cleanTags(cleanContent(rawText.substring(needsIdx).trim()));
      }
    }
  }

  // sec_4: only keep the overview (before first WORK PACKAGE N)
  if (result.sections['sec_4']) {
    const wpIdx = result.sections['sec_4'].search(/WORK PACKAGE\s*\d|Work Package\s*\d/i);
    if (wpIdx > 0) {
      result.sections['sec_4'] = result.sections['sec_4'].substring(0, wpIdx).trim();
    }
  }

  // Extract work packages using raw text (more reliable than HTML for complex tables)
  result.work_packages = extractWorkPackagesFromText(text);

  // Extract risk table
  result.risk_table = extractRiskTable(html);

  // Extract staff table
  result.staff_table = extractStaffTable(html);

  // Extract events table
  result.events_table = extractEventsTable(html);

  return result;
}

function extractCover(html) {
  const cover = {};
  // Find cover table (first table in document)
  const tableHtml = getTableByIndex(html, 0);
  if (!tableHtml) return cover;

  const rows = parseTableRows(tableHtml);
  for (const row of rows) {
    if (row.length >= 2) {
      const label = row[0].toLowerCase();
      if (label.includes('project name')) cover.project_name = row[1];
      if (label.includes('acronym')) cover.acronym = row[1];
      if (label.includes('coordinator')) cover.coordinator = row[1];
    }
  }
  return cover;
}

function extractWorkPackagesFromText(text) {
  const wps = [];
  // Find each "Work Package N:" in raw text
  const wpRegex = /Work Package\s*(\d+)\s*:\s*(.+)/gi;
  const wpPositions = [];
  let m;
  while ((m = wpRegex.exec(text)) !== null) {
    wpPositions.push({ num: parseInt(m[1]), name: m[2].trim(), pos: m.index });
  }

  // Find end of WP section (WRK-PLA-WP close tag)
  const wpEndTag = text.indexOf('#§WRK-PLA-WP§#');
  const wpSectionEnd = wpEndTag > 0 ? wpEndTag : text.length;

  for (let i = 0; i < wpPositions.length; i++) {
    const wpStart = wpPositions[i].pos;
    const wpEnd = i + 1 < wpPositions.length ? wpPositions[i + 1].pos : wpSectionEnd;
    const wpText = text.substring(wpStart, wpEnd);
    const wpNum = wpPositions[i].num;

    // Duration and Lead
    const durMatch = wpText.match(/Duration:\s*(M\d+\s*[–\-]\s*M\d+)/i);
    const leadMatch = wpText.match(/Lead Beneficiary:\s*([^\n]+)/i);

    // Objectives (text between "Objectives" and next heading like "Activities")
    let objectives = '';
    const objIdx = wpText.search(/\bObjectives\b/i);
    const actIdx = wpText.search(/\bActivities and division/i);
    if (objIdx >= 0 && actIdx > objIdx) {
      objectives = wpText.substring(objIdx + 10, actIdx).trim();
      // Clean template instruction remnants
      objectives = objectives.replace(/^.*?specific objectives.*?linked\.?\s*/i, '').trim();
    }

    // Split WP text into cell-like chunks (separated by \n\n)
    const chunks = wpText.split(/\n\n+/).map(s => s.trim()).filter(Boolean);

    // Tasks: find T{n}.{m} entries and collect next 4 fields
    const tasks = [];
    const taskPattern = new RegExp(`^T${wpNum}\\.(\\d[\\d,]*)$`);
    for (let ci = 0; ci < chunks.length; ci++) {
      if (taskPattern.test(chunks[ci])) {
        tasks.push({
          id: chunks[ci],
          name: chunks[ci+1] || '',
          description: chunks[ci+2] || '',
          participants: chunks[ci+3] || '',
          role: chunks[ci+4] || '',
          subcontracting: chunks[ci+5] || '',
        });
      }
    }

    // Milestones: find MS{n} entries and collect next 6 fields
    const milestones = [];
    for (let ci = 0; ci < chunks.length; ci++) {
      if (/^MS\d+$/.test(chunks[ci])) {
        milestones.push({
          id: chunks[ci],
          name: chunks[ci+1] || '',
          wp: chunks[ci+2] || String(wpNum),
          lead: chunks[ci+3] || '',
          description: chunks[ci+4] || '',
          due_date: chunks[ci+5] || '',
          verification: chunks[ci+6] || '',
        });
      }
    }

    // Deliverables: find D{n}.{m} entries and collect next 7 fields
    const deliverables = [];
    const delPattern = new RegExp(`^D${wpNum}\\.\\d+$`);
    for (let ci = 0; ci < chunks.length; ci++) {
      if (delPattern.test(chunks[ci])) {
        deliverables.push({
          id: chunks[ci],
          name: chunks[ci+1] || '',
          wp: chunks[ci+2] || String(wpNum),
          lead: chunks[ci+3] || '',
          type: chunks[ci+4] || '',
          dissemination: chunks[ci+5] || '',
          due_date: chunks[ci+6] || '',
          description: chunks[ci+7] || '',
        });
      }
    }

    wps.push({
      number: wpNum,
      name: wpPositions[i].name.replace(/\n.*/s, '').trim(),
      duration: durMatch ? durMatch[1].trim() : null,
      lead: leadMatch ? leadMatch[1].trim() : null,
      objectives,
      tasks,
      milestones,
      deliverables,
    });
  }
  return wps;
}

// Keep old HTML-based function as fallback
function extractWorkPackages(html) {
  const wps = [];
  // Find WP tables by looking for "Work Package N:" pattern
  const wpRegex = /Work Package\s*(\d+)\s*:\s*([^<]+)/gi;
  let match;
  while ((match = wpRegex.exec(html)) !== null) {
    const wpNum = parseInt(match[1]);
    const wpName = match[2].replace(/<[^>]+>/g, '').trim();

    // Find the table context around this match
    const pos = match.index;

    // Look for duration and lead beneficiary nearby
    const nearby = html.substring(pos, Math.min(pos + 2000, html.length));
    const durMatch = nearby.match(/Duration:\s*(M\d+\s*[–-]\s*M\d+)/i);
    const leadMatch = nearby.match(/Lead Beneficiary:\s*([^<]+)/i);

    const wp = {
      number: wpNum,
      name: wpName,
      duration: durMatch ? durMatch[1].trim() : null,
      lead: leadMatch ? leadMatch[1].trim() : null,
      objectives: '',
      tasks: [],
      milestones: [],
      deliverables: [],
    };

    // Extract tasks table (look for T{n}.{m} pattern in nearby tables)
    const tasksData = extractTasksNearPosition(html, pos, wpNum);
    wp.tasks = tasksData.tasks;
    wp.objectives = tasksData.objectives;
    wp.milestones = tasksData.milestones;
    wp.deliverables = tasksData.deliverables;

    wps.push(wp);
  }
  return wps;
}

function extractTasksNearPosition(html, startPos, wpNum) {
  const result = { objectives: '', tasks: [], milestones: [], deliverables: [] };
  const searchArea = html.substring(startPos, Math.min(startPos + 30000, html.length));

  // Find all tables in this area
  let tPos = 0;
  while (true) {
    const tStart = searchArea.indexOf('<table', tPos);
    if (tStart < 0) break;
    const tEnd = searchArea.indexOf('</table>', tStart);
    if (tEnd < 0) break;
    const tableHtml = searchArea.substring(tStart, tEnd + 8);
    const rows = parseTableRows(tableHtml);

    if (rows.length === 0) { tPos = tEnd + 8; continue; }

    // Check if it's a tasks table (has T{n}.{m} entries)
    const taskPattern = new RegExp(`T${wpNum}\\.\\d`);
    const hasTaskIds = rows.some(r => r.some(c => taskPattern.test(c)));
    if (hasTaskIds) {
      for (const row of rows) {
        if (taskPattern.test(row[0])) {
          result.tasks.push({
            id: row[0]?.trim(),
            name: row[1]?.trim() || '',
            description: row[2]?.trim() || '',
            participants: row[3]?.trim() || '',
            role: row[4]?.trim() || '',
            subcontracting: row[5]?.trim() || '',
          });
        }
      }
    }

    // Check if it's milestones (has MS{n} entries)
    const msPattern = /^MS\d+/;
    const hasMsIds = rows.some(r => r.some(c => msPattern.test(c?.trim())));
    if (hasMsIds) {
      for (const row of rows) {
        if (msPattern.test(row[0]?.trim())) {
          result.milestones.push({
            id: row[0]?.trim(),
            name: row[1]?.trim() || '',
            wp: row[2]?.trim() || '',
            lead: row[3]?.trim() || '',
            description: row[4]?.trim() || '',
            due_date: row[5]?.trim() || '',
            verification: row[6]?.trim() || '',
          });
        }
      }
    }

    // Check if it's deliverables (has D{n}.{m} entries)
    const delPattern = new RegExp(`D${wpNum}\\.\\d`);
    const hasDelIds = rows.some(r => r.some(c => delPattern.test(c?.trim())));
    if (hasDelIds) {
      for (const row of rows) {
        if (delPattern.test(row[0]?.trim())) {
          result.deliverables.push({
            id: row[0]?.trim(),
            name: row[1]?.trim() || '',
            wp: row[2]?.trim() || '',
            lead: row[3]?.trim() || '',
            type: row[4]?.trim() || '',
            dissemination: row[5]?.trim() || '',
            due_date: row[6]?.trim() || '',
            description: row[7]?.trim() || '',
          });
        }
      }
    }

    // Check for objectives (first table after WP header with single-cell content)
    if (rows.length <= 3 && !hasTaskIds && !hasMsIds && !hasDelIds) {
      const objText = rows.map(r => r.join(' ')).join(' ').trim();
      if (objText.length > 20 && !objText.includes('Duration:')) {
        result.objectives = objText;
      }
    }

    tPos = tEnd + 8;
  }

  return result;
}

function extractRiskTable(html) {
  const risks = [];
  const rskPos = html.indexOf('RSK-MGT-RM');
  if (rskPos < 0) return risks;

  // Search wider area to catch split tables
  const searchArea = html.substring(rskPos, Math.min(rskPos + 20000, html.length));
  const tables = getAllTablesInArea(searchArea);

  for (const tableHtml of tables) {
    const rows = parseTableRows(tableHtml);
    for (const row of rows) {
      if (row[0] && /^\d+/.test(row[0].trim()) && row.length >= 3) {
        risks.push({
          number: row[0].trim(),
          description: row[1]?.trim() || '',
          wp: row[2]?.trim() || '',
          mitigation: row[3]?.trim() || '',
        });
      }
    }
  }
  return risks;
}

function extractStaffTable(html) {
  const staff = [];
  const consorPos = html.indexOf('CON-SOR-CS');
  if (consorPos < 0) return staff;

  const searchArea = html.substring(consorPos, Math.min(consorPos + 15000, html.length));
  const tables = getAllTablesInArea(searchArea);

  for (const tableHtml of tables) {
    const rows = parseTableRows(tableHtml);
    // Staff table has Name, Organisation, Role, Profile columns
    const hasStaffData = rows.some(r => r.length >= 3 && r.some(c => /COO|BEN|AE|coordinator/i.test(c)));
    if (hasStaffData) {
      for (const row of rows) {
        if (row.length >= 3 && row[0] && row[0].length > 2 && !/^Name/i.test(row[0])) {
          staff.push({
            name: row[0].trim(),
            organisation: row[1]?.trim() || '',
            role: row[2]?.trim() || '',
            profile: row[3]?.trim() || '',
          });
        }
      }
    }
  }
  return staff;
}

function extractEventsTable(html) {
  const events = [];
  const evtMatch = html.match(/Events meetings and mobility/i);
  if (!evtMatch) return events;

  const evtPos = html.indexOf(evtMatch[0]);
  const searchArea = html.substring(evtPos, Math.min(evtPos + 15000, html.length));
  const tables = getAllTablesInArea(searchArea);

  for (const tableHtml of tables) {
    const rows = parseTableRows(tableHtml);
    for (const row of rows) {
      if (row[0] && /^E[\.\d]+/.test(row[0].trim())) {
        events.push({
          id: row[0].trim(),
          participant: row[1]?.trim() || '',
          type: row[2]?.trim() || '',
          area: row[3]?.trim() || '',
          location: row[4]?.trim() || '',
          duration: row[5]?.trim() || '',
          attendees: row[6]?.trim() || '',
        });
      }
    }
  }
  return events;
}

// ── Helpers ──

function getTableByIndex(html, idx) {
  let pos = 0;
  for (let i = 0; i <= idx; i++) {
    const start = html.indexOf('<table', pos);
    if (start < 0) return null;
    const end = html.indexOf('</table>', start) + 8;
    if (i === idx) return html.substring(start, end);
    pos = end;
  }
  return null;
}

function getAllTablesInArea(area) {
  const tables = [];
  let pos = 0;
  while (true) {
    const start = area.indexOf('<table', pos);
    if (start < 0) break;
    const end = area.indexOf('</table>', start);
    if (end < 0) break;
    tables.push(area.substring(start, end + 8));
    pos = end + 8;
  }
  return tables;
}

function parseTableRows(tableHtml) {
  const rows = [];
  const rowMatches = tableHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  for (const rowHtml of rowMatches) {
    const cells = [];
    const cellMatches = rowHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || [];
    for (const cellHtml of cellMatches) {
      cells.push(cellHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    }
    rows.push(cells);
  }
  return rows;
}

function extractAllTables(html) {
  const tables = [];
  let pos = 0;
  let idx = 0;
  while (true) {
    const start = html.indexOf('<table', pos);
    if (start < 0) break;
    const end = html.indexOf('</table>', start) + 8;
    const tableHtml = html.substring(start, end);
    const rows = parseTableRows(tableHtml);
    tables.push({ index: idx, rows });
    idx++;
    pos = end;
  }
  return tables;
}

function cleanTags(text) {
  return text.replace(/#[@§][A-Z-]+[@§]#/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function htmlToText(html) {
  let text = html;

  // Convert ordered lists: <ol><li>item</li></ol> → "1. item\n2. item\n"
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, inner) => {
    let counter = 1;
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, content) => {
      return (counter++) + '. ' + content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() + '\n';
    });
  });

  // Convert unordered lists: <ul><li>item</li></ul> → "• item\n"
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, inner) => {
    return inner.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, content) => {
      return '• ' + content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() + '\n';
    });
  });

  // Convert remaining <li> (nested or orphan)
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, content) => {
    return '- ' + content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() + '\n';
  });

  // Paragraphs and breaks to newlines
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/h[1-6]>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Clean up whitespace
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n /g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function cleanContent(text) {
  // Known section headings from the EACEA template (to remove)
  const TEMPLATE_HEADINGS = [
    'ADMINISTRATIVE FORMS \\(PART A\\)',
    'TECHNICAL DESCRIPTION \\(PART B\\)',
    'COVER PAGE',
    'PROJECT SUMMARY',
    'RELEVANCE',
    'BACKGROUND AND GENERAL OBJECTIVES',
    'NEEDS ANALYSIS AND SPECIFIC OBJECTIVES',
    'COMPLEMENTARITY WITH OTHER ACTIONS AND INNOVATION.*?ADDED VALUE',
    'QUALITY',
    'PROJECT DESIGN AND IMPLEMENTATION',
    'CONCEPT AND METHODOLOGY',
    'PROJECT MANAGEMENT.*?EVALUATION STRATEGY',
    'PROJECT TEAMS.*?EXPERTS',
    'COST EFFECTIVENESS AND FINANCIAL MANAGEMENT',
    'RISK MANAGEMENT',
    'PARTNERSHIP AND COOPERATION ARRANGEMENTS',
    'CONSORTIUM SET-UP',
    'CONSORTIUM MANAGEMENT AND DECISION-MAKING',
    'IMPACT',
    'IMPACT AND AMBITION',
    'COMMUNICATION.*?DISSEMINATION.*?VISIBILITY',
    'SUSTAINABILITY AND CONTINUATION',
    'WORK PLAN.*?TIMING',
    'WORK PACKAGES',
    'OTHER',
    'ETHICS',
    'SECURITY',
    'DECLARATIONS',
    'ANNEXES',
  ];

  // Remove template headings (full line match, case insensitive)
  for (const h of TEMPLATE_HEADINGS) {
    text = text.replace(new RegExp('^' + h + '\\s*$', 'gmi'), '');
  }

  // Known template sub-headings (mixed case, exact from form)
  const SUB_HEADINGS = [
    'Background and general objectives',
    'Needs analysis and specific objectives',
    'Complementarity with other actions and innovation',
    'Concept and methodology',
    'Project management.*?evaluation strategy',
    'Project teams and staff',
    'Cost effectiveness and financial management.*',
    'Critical risks and risk management strategy',
    'Consortium cooperation and division of roles.*',
    'Consortium management and decision-making.*',
    'Impact and ambition',
    'Communication.*?dissemination.*?visibility.*',
    'Sustainability.*?long-term impact.*?continuation',
    'Work plan',
    'Work packages.*?timing',
    'Insert text',
  ];
  for (const h of SUB_HEADINGS) {
    text = text.replace(new RegExp('^' + h + '\\s*$', 'gmi'), '');
  }

  // Remove template instructions/guidance lines
  const removePatterns = [
    /^Please address .+$/gm,
    /^Describe the .+$/gm,
    /^Describe how .+$/gm,
    /^Describe critical .+$/gm,
    /^Explain how .+$/gm,
    /^Explain the .+$/gm,
    /^Outline the .+$/gm,
    /^Define the .+$/gm,
    /^Indicate .+$/gm,
    /^In what way .+$/gm,
    /^How is the project.+$/gm,
    /^How does the project .+$/gm,
    /^What is the project.+$/gm,
    /^What will need .+$/gm,
    /^What issue.+$/gm,
    /^Which parts .+$/gm,
    /^Which resources .+$/gm,
    /^How will this be achieved.+$/gm,
    /^How will the results .+$/gm,
    /^Are there any possible .+$/gm,
    /^Who are the target .+$/gm,
    /^If your proposal is based .+$/gm,
    /^The objectives should be .+$/gm,
    /^Note: .+$/gm,
    /^Do NOT compare .+$/gm,
    /^\[This document is tagged.+\]$/gm,
    /^See Abstract .+$/gm,
    /^Project summary .+$/gm,
    /^List the staff .+$/gm,
    /^they will work together .+$/gm,
    /^\s*[\u2018\u2019'']Relevance[\u2018\u2019'']\.?\s*$/gm,
    /^\s*[\u2018\u2019'']Impact[\u2018\u2019'']\.?\s*$/gm,
    /^\s*[\u2018\u2019'']Quality[^\u2019']*[\u2018\u2019'']\.?\s*$/gm,
    /^Background and rationale of the project\s*$/gm,
    /^\(if applicable\)\s*$/gm,
    /^\(n\/a for .+\)\s*$/gm,
    /^Provide a brief description .+$/gm,
    /^Provide a concise overview .+$/gm,
    /^This section concerns .+$/gm,
    /^Group your activities .+$/gm,
    /^For each work package.+$/gm,
    /^For each deliverable.+$/gm,
    /^For deliverables such as .+$/gm,
    /^Projects should normally .+$/gm,
    /^Please refer to the Call .+$/gm,
    /^Work packages covering financial support .+$/gm,
    /^Enter each activity.+$/gm,
    /^Ensure consistence .+$/gm,
    /^Show who is participating .+$/gm,
    /^In-kind contributions:.+$/gm,
    /^The Coordinator remains .+$/gm,
    /^If there is subcontracting.+$/gm,
    /^Milestones are control points .+$/gm,
    /^Means of verification .+$/gm,
    /^Deliverables are project outputs .+$/gm,
    /^The labels used mean:.*/gm,
    /^Public — fully open .+$/gm,
    /^Sensitive — limited .+$/gm,
    /^EU classified — .+$/gm,
    /^Month 1 marks the start .+$/gm,
    /^The grouping should .+$/gm,
    /^Objectives\s*$/gm,
    /^Activities and division of work.*$/gm,
    /^Milestones and deliverables.*$/gm,
    /^List the specific objectives .+$/gm,
    /^Note:\s*$/gm,
    /^Ethics \(if applicable\)\s*$/gm,
    /^If the Call document\/Programme Guide contains a section on ethics.+$/gm,
    /^describe ethics issues .+$/gm,
    /^Insert text\s*$/gm,
    /^Not applicable\.?\s*$/gm,
    /^Double funding\s*$/gm,
    /^Information concerning other EU grants .+$/gm,
    /^Please note that there is a strict prohibition .+$/gm,
    /^Seal of Excellence .+$/gm,
    /^If provided in the Call document.+$/gm,
  ];
  for (const pat of removePatterns) {
    text = text.replace(pat, '');
  }

  // Remove multiple blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

module.exports = { parseFormB };
