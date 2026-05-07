/**
 * Renders an EACEA Application Form Part B (BB / LSII) as a .docx buffer
 * using the `docx` library. Preserves the EACEA processing tags
 * (#@TAG@# ... #�TAG�#) verbatim so that round-trip extraction is trivial.
 *
 * Layout follows the official template "Tpl_Application Form (Part B)
 * (ERASMUS BB and LSII)" v2.0 (2022-06-01). Tables are real Word tables.
 *
 * Tag map (open / close):
 *   #@APP-FORM-ERASMUSBBLSII@#  ... whole document
 *   #@PRJ-SUM-PS@#              project summary
 *   #@REL-EVA-RE@#              section 1
 *     #@PRJ-OBJ-PO@#            1.1 + 1.2
 *     #@COM-PLE-CP@#            1.3
 *   #@QUA-LIT-QL@#              section 2
 *     #@CON-MET-CM@#            2.1.1
 *     #@PRJ-MGT-PM@#            2.1.2
 *     #@CON-SOR-CS@#            2.1.3 + 2.2.1 + 2.2.2
 *     #@FIN-MGT-FM@#            2.1.4
 *     #@RSK-MGT-RM@#            2.1.5
 *   #@IMP-ACT-IA@#              3.1
 *   #@COM-DIS-VIS-CDV@#         3.2
 *   #@SUS-CON-SC@#              3.3
 *   #@WRK-PLA-WP@#              section 4
 *   #@ETH-ICS-EI@#              5.1
 *   #@SEC-URI-SU@#              5.2
 *   #@DEC-LAR-DL@#              section 6
 */
'use strict';

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak, ShadingType,
  Header, Footer, PageNumber, LevelFormat,
} = require('docx');

// ── Tag helpers ──────────────────────────────────────────────────────
const OPEN  = (code) => `#@${code}@#`;
const CLOSE = (code) => `#¬${code}¬#`;  // EACEA uses U+00AC (¬) as the closing marker — kept verbatim from the template.

const tagPara = (text) => new Paragraph({
  children: [new TextRun({ text, color: '999999', size: 14 })],
  spacing: { before: 60, after: 60 },
});

// ── Style helpers ────────────────────────────────────────────────────

const H1 = (text, opts = {}) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 180 },
  ...opts,
});
const H2 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 140 },
});
const H3 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 220, after: 120 },
});
const H4 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_4,
  spacing: { before: 180, after: 100 },
});

const P = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text: text || '', ...opts.run })],
  spacing: { before: 60, after: 100 },
  ...opts.p,
});

const guidance = (lines) => new Paragraph({
  children: [new TextRun({
    text: Array.isArray(lines) ? lines.join('  ') : String(lines),
    italics: true, color: '666666', size: 18,
  })],
  spacing: { before: 40, after: 80 },
});

// Convert a multiline narrative string into an array of paragraphs,
// preserving paragraph breaks. Trailing/leading whitespace is trimmed.
const narrative = (text) => {
  if (!text) return [P('[No content yet]', { run: { italics: true, color: '999999' } })];
  const blocks = String(text).replace(/\r\n/g, '\n').split(/\n\s*\n/);
  return blocks
    .map(b => b.trim())
    .filter(Boolean)
    .map(b => P(b));
};

// ── Table helpers ────────────────────────────────────────────────────

const BORDER = {
  top:    { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
  left:   { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
  right:  { style: BorderStyle.SINGLE, size: 4, color: 'BBBBBB' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
  insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' },
};

const HEAD_SHADING = { type: ShadingType.SOLID, color: 'F2F2F2', fill: 'F2F2F2' };

const cell = (content, opts = {}) => new TableCell({
  children: Array.isArray(content) ? content : [P(String(content ?? ''))],
  width: opts.width,
  shading: opts.shading,
});

const headRow = (cells, widths) => new TableRow({
  tableHeader: true,
  children: cells.map((c, i) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: c, bold: true, size: 18 })],
      spacing: { before: 40, after: 40 },
    })],
    width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
    shading: HEAD_SHADING,
  })),
});

const dataRow = (cells, widths) => new TableRow({
  children: cells.map((c, i) => new TableCell({
    children: Array.isArray(c) ? c : [P(String(c ?? ''), { run: { size: 18 } })],
    width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
  })),
});

// ── Render: cover + summary + narrative sections ─────────────────────

function renderCover(ctx) {
  const { project, program, partners } = ctx;
  const coordinator = partners.find(p => p.role === 'applicant') || partners[0] || null;
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 200 },
      children: [new TextRun({
        text: 'EU Grants: Application Form (ERASMUS BB and LS Type II) — Part B',
        bold: true, size: 24,
      })],
    }),
    P(' '),
    P('Call:', { run: { bold: true } }),
    P(program ? program.name : '[programme]', { run: { size: 22 } }),
    P('Topic:', { run: { bold: true } }),
    P(program ? program.action_type : project.type, { run: { size: 22 } }),
    P(' '),
    P('Project title:', { run: { bold: true } }),
    P(project.full_name || project.name, { run: { size: 24, bold: true } }),
    P('Project acronym:', { run: { bold: true } }),
    P(project.name, { run: { size: 22 } }),
    P('Coordinator:', { run: { bold: true } }),
    P(coordinator
        ? `${coordinator.legal_name || coordinator.name} (${coordinator.country})`
        : '[coordinator]',
      { run: { size: 22 } }),
    P('Duration:', { run: { bold: true } }),
    P(`${project.duration_months || '?'} months`, { run: { size: 22 } }),
    P('Requested EU grant:', { run: { bold: true } }),
    P(project.eu_grant != null
        ? `${Number(project.eu_grant).toLocaleString('es-ES')} €`
        : '—',
      { run: { size: 22 } }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function renderProjectSummary(ctx) {
  return [
    H1('PROJECT SUMMARY'),
    tagPara(OPEN('PRJ-SUM-PS')),
    guidance('Provide a brief overview of the project (objectives, target groups, activities, expected results).'),
    ...narrative(ctx.writer.summary_text || ctx.project.description),
    tagPara(CLOSE('PRJ-SUM-PS')),
  ];
}

function renderRelevance(ctx) {
  return [
    H1('1. RELEVANCE'),
    tagPara(OPEN('REL-EVA-RE')),
    tagPara(OPEN('PRJ-OBJ-PO')),

    H2('1.1 Background and general objectives'),
    guidance([
      'Describe the background and rationale of the project.',
      'How is the project relevant to the scope of the call?',
      'How does the project address the general objectives of the call?',
    ]),
    ...narrative(ctx.writer.s1_1_text),

    H2('1.2 Needs analysis and specific objectives'),
    guidance([
      'Describe how the objectives of the project are based on a sound needs analysis.',
      'Define indicators for measuring achievement (unit, baseline, target).',
    ]),
    ...narrative(ctx.writer.s1_2_text),
    tagPara(CLOSE('PRJ-OBJ-PO')),

    tagPara(OPEN('COM-PLE-CP')),
    H2('1.3 Complementarity with other actions and innovation — European added value'),
    guidance([
      'Explain how the project builds on past activities and describe its innovative aspects.',
      'Illustrate the trans-national dimension and EU added value.',
    ]),
    ...narrative(ctx.writer.s1_3_text),
    tagPara(CLOSE('COM-PLE-CP')),
    tagPara(CLOSE('REL-EVA-RE')),
  ];
}

// 2.1.3 — Project teams.
// Layout per official EACEA template:
//   1) "Project teams and staff" — 4-column table (Name and function ·
//      Organisation · Role/tasks · Professional profile and expertise).
//   2) "Outside resources (subcontracting, seconded staff, etc)" — free text.
function renderStaffTable(ctx) {
  const rows = ctx.selectedStaff || [];
  const outside = (ctx.writer.s2_1_3_staff_table || '').trim();
  const out = [];

  // Sub-block A — table
  out.push(H4('Project teams and staff'));
  if (rows.length) {
    out.push(new Table({
      rows: [
        headRow(
          ['Name and function', 'Organisation', 'Role / tasks', 'Professional profile and expertise'],
          [22, 18, 20, 40]
        ),
        ...rows.map(s => dataRow([
          [
            P(s.full_name || '', { run: { bold: true, size: 18 } }),
            ...(s.directory_role ? [P(s.directory_role, { run: { size: 16, italics: true, color: '555555' } })] : []),
          ],
          s.partner_legal_name || s.partner_name || '',
          s.project_role || '—',
          (s.custom_skills && s.custom_skills.trim())
            ? s.custom_skills
            : (s.directory_bio || ''),
        ], [22, 18, 20, 40])),
      ],
      borders: BORDER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  } else {
    out.push(P('[No staff selected yet for this project — visit Writer → Consortium → Staff to select team members.]',
      { run: { italics: true, color: '999999' } }));
  }

  // Sub-block B — outside resources free text
  out.push(P(' '));
  out.push(H4('Outside resources (subcontracting, seconded staff, etc)'));
  if (outside) {
    out.push(...narrative(outside));
  } else {
    out.push(P('Not applicable.', { run: { italics: true, color: '666666' } }));
  }

  return out;
}

// 2.1.5 — Risks. Official 4-column table; no narrative.
function renderRiskTable(ctx) {
  const rows = ctx.risks || [];
  if (!rows.length) {
    return [P('No risks recorded yet.', { run: { italics: true, color: '999999' } })];
  }
  // Build a quick map of WP id → code for the WP column.
  const wpCode = {};
  for (const w of (ctx.wps || [])) wpCode[w.id] = w.code || w.title || '';

  return [
    new Table({
      rows: [
        headRow(
          ['Risk No', 'Description (incl. impact + likelihood)', 'Work package No', 'Proposed risk-mitigation measures'],
          [8, 42, 12, 38]
        ),
        ...rows.map(r => dataRow([
          r.risk_no || '',
          // If likelihood/impact were captured separately, append them as a
          // footer line so they are visible inside the description cell.
          [
            P(r.description || '', { run: { size: 18 } }),
            ...(r.impact || r.likelihood
              ? [P(`Impact: ${r.impact || '—'} · Likelihood: ${r.likelihood || '—'}`,
                  { run: { size: 16, italics: true, color: '666666' } })]
              : []),
          ],
          r.wp_id ? (wpCode[r.wp_id] || '—') : 'cross-cutting',
          r.mitigation || '',
        ], [8, 42, 12, 38])),
      ],
      borders: BORDER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
  ];
}

function renderQuality(ctx) {
  return [
    H1('2. QUALITY'),
    tagPara(OPEN('QUA-LIT-QL')),

    H2('2.1 Project design and implementation'),

    tagPara(OPEN('CON-MET-CM')),
    H3('2.1.1 Concept and methodology'),
    guidance('Outline the approach and methodology behind the project.'),
    ...narrative(ctx.writer.s2_1_1_text),
    tagPara(CLOSE('CON-MET-CM')),

    tagPara(OPEN('PRJ-MGT-PM')),
    H3('2.1.2 Project management, quality assurance and monitoring & evaluation'),
    guidance('Describe measures for high-quality, on-time delivery and evaluation indicators.'),
    ...narrative(ctx.writer.s2_1_2_text),
    tagPara(CLOSE('PRJ-MGT-PM')),

    H3('2.1.3 Project teams, staff and experts'),
    guidance('List staff by function and describe their tasks. Provide CVs (Annex 2).'),
    ...renderStaffTable(ctx),

    tagPara(OPEN('FIN-MGT-FM')),
    H3('2.1.4 Cost effectiveness and financial management'),
    guidance('n/a for prefixed Lump Sum Grants — included for completeness.'),
    ...narrative(ctx.writer.s2_1_4_text || 'Not applicable — this call uses a prefixed Lump Sum grant.'),
    tagPara(CLOSE('FIN-MGT-FM')),

    tagPara(OPEN('RSK-MGT-RM')),
    H3('2.1.5 Risk management'),
    guidance('Describe critical risks (impact, likelihood) and mitigation strategy.'),
    ...renderRiskTable(ctx),
    tagPara(CLOSE('RSK-MGT-RM')),

    H2('2.2 Partnership and cooperation arrangements'),
    tagPara(OPEN('CON-SOR-CS')),

    H3('2.2.1 Consortium set-up'),
    guidance('Describe how the participants will work together and complement each other.'),
    ...narrative(ctx.writer.s2_2_1_text),

    H3('2.2.2 Consortium management and decision-making'),
    guidance('Explain management structures and decision-making mechanisms.'),
    ...narrative(ctx.writer.s2_2_2_text),
    tagPara(CLOSE('CON-SOR-CS')),

    tagPara(CLOSE('QUA-LIT-QL')),
  ];
}

function renderImpact(ctx) {
  return [
    H1('3. IMPACT'),
    tagPara(OPEN('IMP-ACT-IA')),
    H2('3.1 Impact and ambition'),
    guidance('Define short, medium and long-term effects. Identify target groups.'),
    ...narrative(ctx.writer.s3_1_text),
    tagPara(CLOSE('IMP-ACT-IA')),

    tagPara(OPEN('COM-DIS-VIS-CDV')),
    H2('3.2 Communication, dissemination and visibility'),
    guidance('Describe communication and dissemination activities and EU funding visibility.'),
    ...narrative(ctx.writer.s3_2_text),
    tagPara(CLOSE('COM-DIS-VIS-CDV')),

    tagPara(OPEN('SUS-CON-SC')),
    H2('3.3 Sustainability and continuation'),
    guidance('Describe the follow-up after the EU funding ends.'),
    ...narrative(ctx.writer.s3_3_text),
    tagPara(CLOSE('SUS-CON-SC')),
  ];
}

// ── Section 4: Work plan ─────────────────────────────────────────────

function leaderName(ctx, leaderId) {
  if (!leaderId) return '—';
  const p = ctx.partnerById[leaderId];
  return p ? (p.legal_name || p.name) : '—';
}

function renderWorkPackage(ctx, wp, idx) {
  const wpNum = idx + 1;
  const dur = (wp.duration_from_month || 1) + ' – ' + (wp.duration_to_month || ctx.project.duration_months || '?');
  const lead = leaderName(ctx, wp.leader_id);

  const out = [
    H3(`Work Package ${wpNum}: ${wp.title || wp.code}`),
    P(`Duration: M${dur}    ·    Lead beneficiary: ${lead}`,
      { run: { bold: true, size: 20 } }),

    H4('Objectives'),
    ...narrative(wp.objectives || wp.summary || '[No objectives recorded]'),

    H4('Activities and division of work'),
    ...narrative(wp.writerText || wp.summary || ''),
  ];

  // Activities sub-table (for context — describes each concrete activity)
  if (wp.activities.length) {
    const rows = [
      headRow(['Activity', 'Type', 'Months', 'Description'], [22, 14, 12, 52]),
      ...wp.activities.map(a => dataRow([
        a.label,
        a.subtype || a.type,
        `M${a.gantt_start_month ?? '?'} – M${a.gantt_end_month ?? '?'}`,
        (a.description || '').replace(/\s+/g, ' ').slice(0, 600) + ((a.description || '').length > 600 ? '…' : ''),
      ], [22, 14, 12, 52])),
    ];
    out.push(P(' '));
    out.push(new Table({ rows, borders: BORDER, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  // Tasks
  if (wp.tasks.length) {
    out.push(H4('Tasks'));
    out.push(new Table({
      rows: [
        headRow(['Task No.', 'Name', 'Description'], [10, 28, 62]),
        ...wp.tasks.map(t => dataRow([t.code || '', t.title || '', t.description || ''], [10, 28, 62])),
      ],
      borders: BORDER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  }

  // Milestones
  if (wp.milestones.length) {
    out.push(H4('Milestones'));
    out.push(new Table({
      rows: [
        headRow(['MS No.', 'Name', 'Lead', 'Due (month)', 'Means of verification'], [8, 28, 16, 10, 38]),
        ...wp.milestones.map(m => dataRow([
          m.code || '',
          m.title || '',
          leaderName(ctx, m.lead_partner_id),
          m.due_month != null ? `M${m.due_month}` : '—',
          m.verification || '',
        ], [8, 28, 16, 10, 38])),
      ],
      borders: BORDER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  }

  // Deliverables
  if (wp.deliverables.length) {
    out.push(H4('Deliverables'));
    out.push(new Table({
      rows: [
        headRow(['D No.', 'Name', 'Lead', 'Type', 'Diss.', 'Due (month)', 'Description'],
                [8, 22, 14, 8, 8, 8, 32]),
        ...wp.deliverables.map(d => dataRow([
          d.code || '',
          d.title || '',
          leaderName(ctx, d.lead_partner_id),
          d.type || '',
          d.dissemination_level || '',
          d.due_month != null ? `M${d.due_month}` : '—',
          d.description || '',
        ], [8, 22, 14, 8, 8, 8, 32])),
      ],
      borders: BORDER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  }

  out.push(P(' '));
  return out;
}

function renderWorkPlan(ctx) {
  const out = [
    H1('4. WORK PLAN, WORK PACKAGES, ACTIVITIES, RESOURCES AND TIMING'),
    tagPara(OPEN('WRK-PLA-WP')),

    H2('4.1 Work plan'),
    guidance('Brief description of the overall structure of the work plan.'),
    ...narrative(ctx.writer.s4_1_text),

    H2('4.2 Work packages, activities, resources and timing'),
  ];

  ctx.wps.forEach((wp, i) => out.push(...renderWorkPackage(ctx, wp, i)));

  // Events / mobility
  const events = ctx.activities.filter(a =>
    /(meeting|mobility|workshop|conference|event)/i.test(`${a.type} ${a.subtype} ${a.label}`)
  );
  if (events.length) {
    out.push(H2('Events, meetings and mobility'));
    out.push(new Table({
      rows: [
        headRow(['Event No.', 'Name', 'Type', 'Months', 'Description'], [10, 22, 14, 12, 42]),
        ...events.map((a, i) => {
          const wp = ctx.wps.find(w => w.id === a.wp_id);
          const wpNum = wp ? (ctx.wps.indexOf(wp) + 1) : '?';
          return dataRow([
            `E${wpNum}.${i + 1}`,
            a.label || '',
            a.subtype || a.type,
            `M${a.gantt_start_month ?? '?'} – M${a.gantt_end_month ?? '?'}`,
            (a.description || '').replace(/\s+/g, ' ').slice(0, 400),
          ], [10, 22, 14, 12, 42]);
        }),
      ],
      borders: BORDER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  }

  // Timetable (Gantt)
  const months = Math.max(
    ctx.project.duration_months || 24,
    ...ctx.activities.map(a => a.gantt_end_month || 0)
  );
  if (ctx.activities.length) {
    out.push(H2('Timetable'));
    const monthHeaders = Array.from({ length: months }, (_, i) => `M${i + 1}`);
    const widths = [30, ...Array(months).fill(70 / months)];
    const rows = [
      headRow(['Activity', ...monthHeaders], widths),
      ...ctx.activities.map(a => {
        const wp = ctx.wps.find(w => w.id === a.wp_id);
        const wpCode = wp ? wp.code : '?';
        const cells = [`${wpCode} · ${a.label}`];
        for (let m = 1; m <= months; m++) {
          const filled = (a.gantt_start_month ?? 0) <= m && m <= (a.gantt_end_month ?? -1);
          cells.push(filled ? '■' : '');
        }
        return dataRow(cells, widths);
      }),
    ];
    out.push(new Table({
      rows,
      borders: BORDER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }));
  }

  out.push(tagPara(CLOSE('WRK-PLA-WP')));
  return out;
}

function renderOther(ctx) {
  return [
    H1('5. OTHER'),
    tagPara(OPEN('ETH-ICS-EI')),
    H2('5.1 Ethics'),
    guidance('Describe ethics issues, gender mainstreaming and children\'s rights, if applicable.'),
    ...narrative(ctx.writer.s5_1_text),
    tagPara(CLOSE('ETH-ICS-EI')),

    tagPara(OPEN('SEC-URI-SU')),
    H2('5.2 Security'),
    ...narrative(ctx.writer.s5_2_text || 'Not applicable.'),
    tagPara(CLOSE('SEC-URI-SU')),
  ];
}

function renderDeclarations(ctx) {
  return [
    H1('6. DECLARATIONS'),
    tagPara(OPEN('DEC-LAR-DL')),

    H3('Double funding'),
    guidance('There is a strict prohibition of double funding from the EU budget.'),
    P('We confirm that to our best knowledge neither the project as a whole nor any parts of it have benefitted from any other EU grant.', { run: { bold: true } }),
    ...narrative(ctx.writer.s6_1_details),

    H3('Financial support to third parties'),
    ...narrative(ctx.writer.s6_2_justification),

    H3('Seal of Excellence'),
    P('YES — proposal data may be shared with other EU and national funding bodies.'),
    tagPara(CLOSE('DEC-LAR-DL')),
  ];
}

function renderAnnexPreviousProjects(ctx) {
  if (!ctx.euProjects.length) {
    return [
      H1('ANNEX — List of previous projects'),
      P('No previous EU-funded projects recorded.', { run: { italics: true, color: '666666' } }),
    ];
  }
  return [
    H1('ANNEX — List of previous projects'),
    guidance('Previous projects of the consortium during the last 4 years.'),
    new Table({
      rows: [
        headRow(['Participant', 'Reference / Title', 'Programme', 'Year', 'Role', 'Beneficiary', 'Notes'],
                [16, 28, 14, 14, 8, 10, 10]),
        ...ctx.euProjects.map(p => dataRow([
          p.partner_name || '',
          [p.reference_no, p.title].filter(Boolean).join(' — '),
          p.programme || '',
          p.year || '',
          p.role || '',
          p.beneficiary_name || '',
          '',
        ], [16, 28, 14, 14, 8, 10, 10])),
      ],
      borders: BORDER,
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
  ];
}

// ── Public entry point ───────────────────────────────────────────────

async function renderFormBDocx(ctx) {
  const children = [
    tagPara(OPEN('APP-FORM-ERASMUSBBLSII')),
    ...renderCover(ctx),
    ...renderProjectSummary(ctx),
    ...renderRelevance(ctx),
    ...renderQuality(ctx),
    ...renderImpact(ctx),
    ...renderWorkPlan(ctx),
    ...renderOther(ctx),
    ...renderDeclarations(ctx),
    ...renderAnnexPreviousProjects(ctx),
    tagPara(CLOSE('APP-FORM-ERASMUSBBLSII')),
  ];

  const doc = new Document({
    creator: 'EU Funding School — E+ Tools',
    title: `Application Form Part B — ${ctx.project.full_name || ctx.project.name}`,
    description: 'Auto-generated from project data',
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [{
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({
              text: `Part B — ${ctx.project.name}`,
              size: 16, color: '999999',
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16 }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  return await Packer.toBuffer(doc);
}

module.exports = { renderFormBDocx };
