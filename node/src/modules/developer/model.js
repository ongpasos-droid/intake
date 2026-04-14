const db = require('../../utils/db');
const genUUID = require('../../utils/uuid');

// ============ PROJECT CONTEXT (read-only from intake) ============

async function getProjectContext(projectId, userId) {
  // Project
  const [projects] = await db.execute(
    'SELECT id, name, type, description, start_date, duration_months, eu_grant, cofin_pct, indirect_pct, status FROM projects WHERE id = ? AND user_id = ?',
    [projectId, userId]
  );
  if (!projects.length) return null;
  const project = projects[0];

  // Partners
  const [partners] = await db.execute(
    'SELECT id, name, city, country, role, order_index FROM partners WHERE project_id = ? ORDER BY order_index',
    [projectId]
  );

  // Context
  const [contexts] = await db.execute(
    'SELECT problem, target_groups, approach FROM intake_contexts WHERE project_id = ? LIMIT 1',
    [projectId]
  );

  // Work packages + activities
  const [wps] = await db.execute(
    'SELECT id, order_index, code, title, category, leader_id FROM work_packages WHERE project_id = ? ORDER BY order_index',
    [projectId]
  );
  for (const wp of wps) {
    const [acts] = await db.execute(
      'SELECT id, type, label, subtype, description, date_start, date_end FROM activities WHERE wp_id = ? ORDER BY order_index',
      [wp.id]
    );
    wp.activities = acts;
  }

  // Budget totals (from Calculator state if saved)
  const partnerIds = partners.map(p => p.id);
  let budget = { total: 0, byWP: [] };
  // Simple: count activities per WP as proxy
  budget.byWP = wps.map(wp => ({ code: wp.code, title: wp.title, activities: wp.activities.length }));

  return {
    project,
    partners,
    context: contexts[0] || null,
    wps,
    budget,
  };
}

// ============ FORM INSTANCE MANAGEMENT ============

async function getOrCreateInstance(projectId, userId) {
  // Check if instance already exists for this project
  const [existing] = await db.execute(
    'SELECT fi.*, ft.template_json FROM form_instances fi LEFT JOIN form_templates ft ON ft.id = fi.template_id WHERE fi.project_id = ? AND fi.user_id = ?',
    [projectId, userId]
  );
  if (existing.length) {
    return existing[0];
  }

  // Find the matching template via program
  const [project] = await db.execute('SELECT type FROM projects WHERE id = ?', [projectId]);
  if (!project.length) throw new Error('Project not found');

  const [programs] = await db.execute(
    'SELECT id, form_template_id FROM intake_programs WHERE action_type = ? LIMIT 1',
    [project[0].type]
  );

  let templateId = null;
  if (programs.length && programs[0].form_template_id) {
    templateId = programs[0].form_template_id;
  } else {
    // Fallback: use first active template
    const [templates] = await db.execute('SELECT id FROM form_templates WHERE active = 1 LIMIT 1');
    if (templates.length) templateId = templates[0].id;
  }

  // Create new instance
  const id = genUUID();
  await db.execute(
    `INSERT INTO form_instances (id, user_id, template_id, program_id, project_id, title, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')`,
    [id, userId, templateId, programs[0]?.id || null, projectId, 'Draft — ' + project[0].type]
  );

  const [created] = await db.execute(
    'SELECT fi.*, ft.template_json FROM form_instances fi LEFT JOIN form_templates ft ON ft.id = fi.template_id WHERE fi.id = ?',
    [id]
  );
  return created[0];
}

async function getInstance(instanceId, userId) {
  const [rows] = await db.execute(
    'SELECT fi.*, ft.template_json FROM form_instances fi LEFT JOIN form_templates ft ON ft.id = fi.template_id WHERE fi.id = ? AND fi.user_id = ?',
    [instanceId, userId]
  );
  return rows[0] || null;
}

async function updateInstanceStatus(instanceId, userId, status) {
  await db.execute(
    'UPDATE form_instances SET status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
    [status, instanceId, userId]
  );
}

// ============ FIELD VALUES ============

async function getFieldValues(instanceId) {
  const [rows] = await db.execute(
    'SELECT field_id, section_path, value_text, value_json, updated_at FROM form_field_values WHERE instance_id = ? ORDER BY field_id',
    [instanceId]
  );
  const values = {};
  for (const r of rows) {
    values[r.field_id] = {
      text: r.value_text || '',
      json: r.value_json ? JSON.parse(r.value_json) : null,
      section: r.section_path,
      updated: r.updated_at,
    };
  }
  return values;
}

async function saveFieldValue(instanceId, fieldId, sectionPath, text, json) {
  // Upsert
  const [existing] = await db.execute(
    'SELECT id FROM form_field_values WHERE instance_id = ? AND field_id = ?',
    [instanceId, fieldId]
  );
  if (existing.length) {
    await db.execute(
      'UPDATE form_field_values SET value_text = ?, value_json = ?, section_path = ?, updated_at = NOW() WHERE instance_id = ? AND field_id = ?',
      [text || '', json ? JSON.stringify(json) : null, sectionPath || '', instanceId, fieldId]
    );
  } else {
    await db.execute(
      'INSERT INTO form_field_values (id, instance_id, field_id, section_path, value_text, value_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [genUUID(), instanceId, fieldId, sectionPath || '', text || '', json ? JSON.stringify(json) : null]
    );
  }
}

async function saveFieldValuesBulk(instanceId, fields) {
  for (const f of fields) {
    await saveFieldValue(instanceId, f.field_id, f.section_path, f.text, f.json);
  }
}

// ============ EVAL CRITERIA (read-only) ============

async function getEvalCriteria(programType) {
  const [sections] = await db.execute(
    `SELECT es.id, es.title, es.sort_order, es.max_score
     FROM eval_sections es
     ORDER BY es.sort_order`
  );
  for (const sec of sections) {
    const [questions] = await db.execute(
      'SELECT id, title, code, weight, sort_order FROM eval_questions WHERE section_id = ? ORDER BY sort_order',
      [sec.id]
    );
    for (const q of questions) {
      const [criteria] = await db.execute(
        'SELECT id, title, meaning, max_score, score_rubric FROM eval_criteria WHERE question_id = ? ORDER BY sort_order',
        [q.id]
      );
      q.criteria = criteria;
    }
    sec.questions = questions;
  }
  return sections;
}

// ============ PREP STUDIO ============

async function getInterviewAnswers(projectId) {
  const [rows] = await db.execute(
    'SELECT question_key, question_text, answer_text, sort_order, tab FROM writer_interviews WHERE project_id = ? ORDER BY sort_order',
    [projectId]
  );
  return rows;
}

async function saveInterviewAnswer(projectId, userId, key, answer) {
  const [existing] = await db.execute(
    'SELECT id FROM writer_interviews WHERE project_id = ? AND question_key = ?',
    [projectId, key]
  );
  if (existing.length) {
    await db.execute(
      'UPDATE writer_interviews SET answer_text = ? WHERE project_id = ? AND question_key = ?',
      [answer, projectId, key]
    );
  }
  // If not exists, it was generated and not yet saved — create it
  else {
    await db.execute(
      'INSERT INTO writer_interviews (id, project_id, user_id, question_key, question_text, answer_text, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [genUUID(), projectId, userId, key, key, answer, 0]
    );
  }
}

async function generateInterviewQuestions(projectId, userId) {
  const ctx = await getProjectContext(projectId, userId);
  if (!ctx) return [];

  const projectText = buildProjectContext(ctx);

  // Build activity detail block
  const activityDetail = ctx.wps.map(wp => {
    return `${wp.code} ${wp.title}:\n` + (wp.activities || []).map(a =>
      `  - ${a.label}${a.subtype ? ' (' + a.subtype + ')' : ''}: ${a.description ? a.description.substring(0, 150) : 'No description'}`
    ).join('\n');
  }).join('\n\n');

  const system = `You are a senior proposal consultant preparing a coordinator for writing their Erasmus+ proposal. You need to extract the HUMAN stories, specific details, and creative vision that no AI can invent.

Your questions must:
- Be SPECIFIC to THIS project (reference partner names, cities, activities)
- Target the GAPS in the project data — where information is generic or missing
- Extract storytelling material: real situations, personal motivations, local context
- Uncover the "why" behind design choices
- Get practical details that make the proposal feel authentic

Each question must be assigned to a tab where it will appear in the Prep Studio:
- "consorcio" — questions about partners, why they were chosen, how they complement each other
- "presupuesto" — questions about cost-effectiveness, co-financing, resource allocation
- "relevancia" — questions about the origin story, problem, unique approach, innovation, EU value
- "actividades" — questions about expected results, impact measurement, methodology innovation

Output exactly 10 questions as a JSON array of objects:
[{"key":"origin_story","tab":"relevancia","question":"..."},{"key":"partner_choice","tab":"consorcio","question":"..."},...]

Distribute roughly: 3 relevancia, 3 consorcio, 2 actividades, 2 presupuesto.
Keys should be short snake_case identifiers. Questions should be in the language of the project coordinator (Spanish if the coordinator is from Spain).`;

  const user = `PROJECT DATA:\n${projectText}\n\nACTIVITY DETAILS:\n${activityDetail}\n\nGenerate 10 interview questions distributed across 4 tabs (consorcio, presupuesto, relevancia, actividades). Focus on what's MISSING or GENERIC in the current data.`;

  const result = await callAI(system, user, 'generate');

  // Parse JSON from response
  let questions = [];
  try {
    const match = result.match(/\[[\s\S]*\]/);
    questions = match ? JSON.parse(match[0]) : [];
  } catch { questions = []; }

  // Save questions to DB (with tab assignment)
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const tab = q.tab || 'relevancia'; // default to relevancia if AI omits tab
    const [existing] = await db.execute(
      'SELECT id FROM writer_interviews WHERE project_id = ? AND question_key = ?',
      [projectId, q.key]
    );
    if (!existing.length) {
      await db.execute(
        'INSERT INTO writer_interviews (id, project_id, user_id, question_key, question_text, answer_text, sort_order, tab) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)',
        [genUUID(), projectId, userId, q.key, q.question, i, tab]
      );
    }
  }

  return questions;
}

async function getResearchDocs(projectId) {
  const [rows] = await db.execute(
    `SELECT wrd.id, wrd.document_id, wrd.label, d.title, d.file_type, d.file_size_bytes, d.storage_path
     FROM writer_research_docs wrd
     JOIN documents d ON d.id = wrd.document_id
     WHERE wrd.project_id = ? AND d.status = 'active'
     ORDER BY wrd.sort_order`,
    [projectId]
  );
  return rows;
}

async function addResearchDoc(projectId, docData) {
  const docModel = require('../documents/model');
  // Save file
  const safeName = `research-${projectId.substring(0,8)}-${Date.now()}.${docData.ext}`;
  const storagePath = await docModel.saveFile(docData.buffer, safeName);
  // Create document record
  const doc = await docModel.createDocument({
    owner_type: 'project', owner_id: projectId, doc_type: 'research',
    title: docData.title, file_type: docData.ext,
    file_size_bytes: docData.buffer.length, storage_path: storagePath,
  });
  // Link to project
  const id = genUUID();
  await db.execute(
    'INSERT INTO writer_research_docs (id, project_id, document_id, label) VALUES (?, ?, ?, ?)',
    [id, projectId, doc.id, docData.title]
  );
  // Vectorize in background
  try {
    const { processDocument } = require('../../services/vectorize');
    const mimeMap = { pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    processDocument(doc.id, { storage_path: storagePath, file_type: mimeMap[docData.ext] || 'text/plain' });
  } catch (e) { console.error('[PrepStudio] vectorize error:', e.message); }
  return { id, document_id: doc.id, label: docData.title };
}

async function removeResearchDoc(projectId, docId) {
  await db.execute('DELETE FROM writer_research_docs WHERE project_id = ? AND document_id = ?', [projectId, docId]);
}

async function getGapAnalysis(projectId, userId) {
  const ctx = await getProjectContext(projectId, userId);
  if (!ctx) return { gaps: [] };

  const interviews = await getInterviewAnswers(projectId);
  const researchDocs = await getResearchDocs(projectId);
  const answeredCount = interviews.filter(i => i.answer_text && i.answer_text.trim().length > 20).length;

  const gaps = [];
  const strengths = [];

  // Check project data completeness
  if (ctx.context?.problem && ctx.context.problem.length > 200) strengths.push('Problema/necesidad bien descrito');
  else gaps.push({ area: 'Problema/necesidad', detail: 'El texto del problema es corto. Responde a la entrevista para enriquecerlo.', section: '1.1' });

  if (ctx.context?.approach && ctx.context.approach.length > 200) strengths.push('Enfoque/metodologia descrito');
  else gaps.push({ area: 'Enfoque/metodologia', detail: 'La descripcion del enfoque es breve. Anade mas detalle sobre como funcionara el proyecto.', section: '2.1.1' });

  if (ctx.context?.target_groups && ctx.context.target_groups.length > 100) strengths.push('Grupos destinatarios identificados');
  else gaps.push({ area: 'Grupos destinatarios', detail: 'Faltan detalles sobre los grupos destinatarios: perfiles, numeros, como los alcanzareis.', section: '1.2' });

  // Check activities
  const actsWithDesc = ctx.wps.reduce((s, wp) => s + (wp.activities || []).filter(a => a.description && a.description.length > 50).length, 0);
  const totalActs = ctx.wps.reduce((s, wp) => s + (wp.activities || []).length, 0);
  if (actsWithDesc >= totalActs * 0.8) strengths.push(`${actsWithDesc}/${totalActs} actividades con descripcion`);
  else gaps.push({ area: 'Descripciones de actividades', detail: `Solo ${actsWithDesc} de ${totalActs} actividades tienen descripcion detallada. Enriquece las descripciones en Intake.`, section: '4.2' });

  // Check partners
  if (ctx.partners.length >= 3) strengths.push(`${ctx.partners.length} socios en el consorcio`);
  else gaps.push({ area: 'Consorcio', detail: 'Pocos socios. KA3 requiere minimo 5 socios de 5 paises.', section: '2.2.1' });

  // Check research docs
  if (researchDocs.length >= 2) strengths.push(`${researchDocs.length} documentos de investigacion subidos`);
  else gaps.push({ area: 'Documentacion tematica', detail: 'Sube informes o estudios sobre tu tematica para fundamentar mejor la propuesta.', section: '1.1' });

  // Check interview
  if (answeredCount >= 5) strengths.push(`${answeredCount} preguntas de entrevista respondidas`);
  else if (interviews.length === 0) gaps.push({ area: 'Entrevista', detail: 'Genera las preguntas y responde al menos 5 para dar contexto humano a la propuesta.', section: 'all' });
  else gaps.push({ area: 'Entrevista', detail: `Solo ${answeredCount} de ${interviews.length} preguntas respondidas. Completa mas para mejorar la calidad.`, section: 'all' });

  // WP descriptions
  const wpsWithCat = ctx.wps.filter(wp => wp.category).length;
  if (wpsWithCat >= ctx.wps.length - 1) strengths.push('WPs con categorias asignadas');

  return { gaps, strengths, stats: { partners: ctx.partners.length, wps: ctx.wps.length, activities: totalActs, actsWithDesc, researchDocs: researchDocs.length, interviewAnswered: answeredCount, interviewTotal: interviews.length } };
}

// ============ AI SERVICE — Full Context Pipeline ============

// ── Gemini (cheap, for draft generation) ────────────────────
let geminiModel = null;
function getGemini() {
  if (geminiModel) return geminiModel;
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(key);
  geminiModel = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
  return geminiModel;
}

async function callGemini(systemPrompt, userPrompt) {
  const model = getGemini();
  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 4096, temperature: 1.0 },
  });
  return result.response.text();
}

// ── Claude (quality, for evaluation & improvement) ──────────
let Anthropic = null;
function getClient() {
  if (!Anthropic) Anthropic = require('@anthropic-ai/sdk');
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not configured');
  return new Anthropic({ apiKey: key });
}

async function callClaude(systemPrompt, userPrompt, maxTokens = 4096) {
  const client = getClient();
  const response = await client.messages.create({
    model: process.env.AI_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature: 0.9,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });
  return response.content[0]?.text || '';
}

// ── Smart router: Gemini for generation, Claude for quality ──
async function callAI(systemPrompt, userPrompt, purpose = 'generate') {
  // Use Gemini for draft generation (cheap, big context)
  // Use Claude for evaluation & improvement (higher quality)
  if (purpose === 'generate' && process.env.GEMINI_API_KEY && process.env.GEMINI_ENABLED === 'true') {
    try {
      return await callGemini(systemPrompt, userPrompt);
    } catch (err) {
      console.warn('[AI] Gemini failed, falling back to Claude:', err.message);
    }
  }
  return await callClaude(systemPrompt, userPrompt);
}

// ── Rich project context builder ────────────────────────────

function buildProjectContext(ctx) {
  const p = ctx.project;
  const context = ctx.context || {};

  // Detailed partner profiles
  const partnerBlock = ctx.partners.map((pt, i) => {
    const role = i === 0 ? 'COORDINATOR' : `Partner ${i + 1}`;
    return `${role}: ${pt.name} — ${pt.city}, ${pt.country} (${pt.role || 'partner'})`;
  }).join('\n');

  // Detailed WP + activities with descriptions and dates
  const wpBlock = ctx.wps.map(wp => {
    const leader = ctx.partners.find(p => p.id === wp.leader_id);
    let block = `\n${wp.code} — ${wp.title}`;
    if (wp.category) block += ` [Category: ${wp.category}]`;
    if (leader) block += ` | Leader: ${leader.name}`;
    for (const act of (wp.activities || [])) {
      block += `\n  • ${act.label || act.type}`;
      if (act.subtype) block += ` (${act.subtype})`;
      if (act.date_start && act.date_end) block += ` [${act.date_start} → ${act.date_end}]`;
      if (act.description) block += `\n    ${act.description.substring(0, 300)}`;
    }
    return block;
  }).join('\n');

  return `═══ PROJECT OVERVIEW ═══
Acronym: ${p.name}
Full title: ${p.description || p.name}
Programme: ${p.type || 'Erasmus+'}
Duration: ${p.duration_months || 24} months
Start date: ${p.start_date || 'TBD'}
EU Grant: €${Number(p.eu_grant || 500000).toLocaleString('en')}
Co-financing: ${p.cofin_pct || 80}%
Indirect costs: ${p.indirect_pct || 7}%

═══ CONSORTIUM (${ctx.partners.length} organisations) ═══
${partnerBlock}

═══ PROBLEM & NEEDS ═══
${context.problem || 'Not specified'}

═══ TARGET GROUPS ═══
${context.target_groups || 'Not specified'}

═══ APPROACH & METHODOLOGY ═══
${context.approach || 'Not specified'}

═══ WORK PLAN (${ctx.wps.length} Work Packages) ═══
${wpBlock}`;
}

// ── Enriched context builder (uses PIFs, budget, impacts) ───

async function buildEnrichedContext(projectId, userId) {
  const ctx = await getProjectContext(projectId, userId);
  if (!ctx) return '';

  const p = ctx.project;
  const context = ctx.context || {};

  // ── Consortium with adapted PIFs ──
  let consortiumBlock = '';
  for (let i = 0; i < ctx.partners.length; i++) {
    const pt = ctx.partners[i];
    const role = i === 0 ? 'COORDINATOR' : `Partner ${i + 1}`;
    consortiumBlock += `\n${role}: ${pt.name} — ${pt.city}, ${pt.country}`;

    if (pt.organization_id) {
      // Try to load adapted PIF for this project
      const [pifs] = await db.execute(
        `SELECT pp.custom_text, v.adapted_text
         FROM project_partner_pifs pp
         LEFT JOIN org_pif_variants v ON v.id = pp.variant_id
         WHERE pp.project_id = ? AND pp.partner_id = ?`,
        [projectId, pt.id]
      );
      const pifText = pifs[0]?.custom_text || pifs[0]?.adapted_text;

      if (pifText) {
        consortiumBlock += `\n  Profile: ${pifText.substring(0, 600)}`;
      } else {
        // Fallback to generic org description
        const [orgs] = await db.execute('SELECT description, activities_experience FROM organizations WHERE id = ?', [pt.organization_id]);
        if (orgs[0]?.description) consortiumBlock += `\n  Profile: ${orgs[0].description.substring(0, 400)}`;
      }

      // Key staff
      const [staff] = await db.execute('SELECT name, role, skills_summary FROM org_key_staff WHERE organization_id = ? LIMIT 5', [pt.organization_id]);
      if (staff.length) {
        consortiumBlock += `\n  Key staff: ${staff.map(s => `${s.name} (${s.role}${s.skills_summary ? ': ' + s.skills_summary.substring(0, 80) : ''})`).join('; ')}`;
      }

      // Past EU projects
      const [euProj] = await db.execute('SELECT title, role, year FROM org_eu_projects WHERE organization_id = ? ORDER BY year DESC LIMIT 5', [pt.organization_id]);
      if (euProj.length) {
        consortiumBlock += `\n  EU projects: ${euProj.map(ep => `${ep.title || 'Untitled'} (${ep.year}, ${ep.role})`).join('; ')}`;
      }
    }
  }

  // ── Budget summary ──
  let budgetBlock = 'Not configured';
  const budgetData = await getPrepPresupuesto(projectId);
  if (budgetData) {
    const bens = budgetData.beneficiaries || [];
    const totalGrant = bens.reduce((s, bn) => s + (bn.total || 0), 0);
    budgetBlock = `Total EU Grant: €${totalGrant.toLocaleString('en')}`;
    if (bens.length) {
      budgetBlock += `\nPer partner: ${bens.map(bn => `${bn.name}: €${(bn.total || 0).toLocaleString('en')}${bn.is_coordinator ? ' (coordinator)' : ''}`).join(', ')}`;
      budgetBlock += `\nCategories: A(Staff)=€${bens.reduce((s, b) => s + (b.cat_a || 0), 0).toLocaleString('en')}, B(Subcontr.)=€${bens.reduce((s, b) => s + (b.cat_b || 0), 0).toLocaleString('en')}, C(Other)=€${bens.reduce((s, b) => s + (b.cat_c || 0), 0).toLocaleString('en')}, D(Support)=€${bens.reduce((s, b) => s + (b.cat_d || 0), 0).toLocaleString('en')}`;
    }
    const wps = budgetData.work_packages || [];
    if (wps.length) {
      budgetBlock += `\nPer WP: ${wps.map(wp => `${wp.label}: €${(wp.total || 0).toLocaleString('en')}`).join(', ')}`;
    }
  }

  // ── Activities with tasks and deliverables ──
  const actData = await getPrepActividades(projectId);
  let actBlock = '';
  for (const wp of (actData.wps || [])) {
    const leader = ctx.partners.find(p => p.id === wp.leader_id);
    actBlock += `\n${wp.code} — ${wp.title}`;
    if (leader) actBlock += ` (Leader: ${leader.name})`;
    if (wp.summary) actBlock += `\n  Summary: ${wp.summary.substring(0, 400)}`;
    for (const act of (wp.activities || [])) {
      actBlock += `\n  • ${act.label || act.type}`;
      if (act.description) actBlock += `: ${act.description.substring(0, 250)}`;
      if (act.date_start) actBlock += ` [${act.date_start} → ${act.date_end || '?'}]`;
      for (const t of (act.tasks || [])) {
        actBlock += `\n    - ${t.title}`;
        if (t.deliverable) actBlock += ` → Deliverable: ${t.deliverable}`;
        if (t.milestone) actBlock += ` | Milestone: ${t.milestone}`;
        if (t.kpi) actBlock += ` | KPI: ${t.kpi}`;
      }
    }
  }

  // ── Interview answers grouped by tab ──
  const interviews = await getInterviewAnswers(projectId);
  const answered = interviews.filter(i => i.answer_text && i.answer_text.trim().length > 10);
  let interviewBlock = '';
  if (answered.length) {
    const byTab = {};
    for (const a of answered) {
      const tab = a.tab || 'relevancia';
      if (!byTab[tab]) byTab[tab] = [];
      byTab[tab].push(a);
    }
    for (const [tab, qs] of Object.entries(byTab)) {
      interviewBlock += `\n[${tab.toUpperCase()}]`;
      for (const a of qs) {
        interviewBlock += `\nQ: ${a.question_text}\nA: ${a.answer_text}\n`;
      }
    }
  }

  return `═══ PROJECT OVERVIEW ═══
Acronym: ${p.name}
Full title: ${p.description || p.name}
Programme: ${p.type || 'Erasmus+'}
Duration: ${p.duration_months || 24} months
Start date: ${p.start_date || 'TBD'}
EU Grant: €${Number(p.eu_grant || 500000).toLocaleString('en')}
Co-financing: ${p.cofin_pct || 80}%

═══ CONSORTIUM (${ctx.partners.length} organisations — detailed profiles) ═══
${consortiumBlock}

═══ PROBLEM & NEEDS ═══
${context.problem || 'Not specified'}

═══ TARGET GROUPS ═══
${context.target_groups || 'Not specified'}

═══ APPROACH & METHODOLOGY ═══
${context.approach || 'Not specified'}

═══ BUDGET ═══
${budgetBlock}

═══ ACTIVITIES, DELIVERABLES & IMPACTS ═══
${actBlock || 'No activities defined'}

${interviewBlock ? `═══ COORDINATOR'S OWN WORDS ═══${interviewBlock}` : ''}`;
}

// ── RAG: Retrieve relevant document chunks ──────────────────

async function retrieveRelevantChunks(query, programId, topK = 8) {
  const { generateEmbedding, cosineSimilarity } = require('../../services/embeddings');

  // Get all chunks from program documents
  const [chunks] = await db.execute(
    `SELECT dc.content, dc.embedding, d.title as doc_title
     FROM document_chunks dc
     JOIN documents d ON d.id = dc.document_id
     JOIN document_programs dp ON dp.document_id = d.id
     WHERE dp.program_id = ?`,
    [programId]
  );

  if (!chunks.length) return '';

  // Generate query embedding
  const queryEmb = await generateEmbedding(query);

  // Score and sort
  const scored = chunks.map(c => {
    const emb = typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding;
    return { content: c.content, doc: c.doc_title, score: cosineSimilarity(queryEmb, emb) };
  }).sort((a, b) => b.score - a.score).slice(0, topK);

  return scored.map(c => `[${c.doc}] ${c.content}`).join('\n\n');
}

// ── RAG: Retrieve chunks from user's research documents ─────

async function retrieveResearchChunks(query, projectId, topK = 6) {
  const { generateEmbedding, cosineSimilarity } = require('../../services/embeddings');
  // Get research doc IDs for this project
  const [docs] = await db.execute(
    'SELECT document_id FROM writer_research_docs WHERE project_id = ?', [projectId]
  );
  if (!docs.length) return '';
  const docIds = docs.map(d => d.document_id);
  const ph = docIds.map(() => '?').join(',');
  const [chunks] = await db.execute(
    `SELECT dc.content, dc.embedding, d.title as doc_title FROM document_chunks dc JOIN documents d ON d.id = dc.document_id WHERE dc.document_id IN (${ph})`, docIds
  );
  if (!chunks.length) return '';
  const queryEmb = await generateEmbedding(query);
  const scored = chunks.map(c => {
    const emb = typeof c.embedding === 'string' ? JSON.parse(c.embedding) : c.embedding;
    return { content: c.content, doc: c.doc_title, score: cosineSimilarity(queryEmb, emb) };
  }).sort((a, b) => b.score - a.score).slice(0, topK);
  return scored.map(c => `[${c.doc}] ${c.content}`).join('\n\n');
}

// ── Get writing rules from call_eligibility ─────────────────

async function getWritingRules(programId) {
  const [rows] = await db.execute(
    'SELECT writing_style, ai_detection_rules FROM call_eligibility WHERE program_id = ?',
    [programId]
  );
  return rows[0] || { writing_style: null, ai_detection_rules: null };
}

// ── Get eval guidance for a specific section ────────────────

async function getEvalGuidanceForSection(sectionFieldId) {
  // Map field ID to form_ref pattern
  const refMap = {
    's1_1_text': 'sec_1', 's1_2_text': 'sec_1', 's1_3_text': 'sec_1',
    's2_1_1_text': 'sec_2_1', 's2_1_2_text': 'sec_2_1', 's2_1_4_text': 'sec_2_1',
    's2_2_1_text': 'sec_2_2', 's2_2_2_text': 'sec_2_2',
    's3_1_text': 'sec_3', 's3_2_text': 'sec_3', 's3_3_text': 'sec_3',
    's4_1_text': 'sec_4', 's4_2_text': 'sec_4',
    's5_1_text': 'sec_5', 's5_2_text': 'sec_5',
    'summary_text': 'summary',
  };
  const formRef = refMap[sectionFieldId];
  if (!formRef) return '';

  // Get section + questions
  const [sections] = await db.execute(
    'SELECT id, title, max_score FROM eval_sections WHERE form_ref = ?', [formRef]
  );
  if (!sections.length) return '';

  const sec = sections[0];
  const [questions] = await db.execute(
    'SELECT title, code FROM eval_questions WHERE section_id = ? ORDER BY sort_order', [sec.id]
  );

  // Find the specific sub-question matching this field
  const subNum = sectionFieldId.match(/s(\d+)_(\d+)/);
  let guidance = `EVALUATION SECTION: ${sec.title}`;
  if (sec.max_score > 0) guidance += ` (max ${sec.max_score} points)`;
  guidance += '\n\nEVALUATORS WILL ASSESS:';
  for (const q of questions) {
    guidance += `\n• ${q.title}`;
  }
  return guidance;
}

// ── Get previously generated sections for consistency ───────

async function getPreviousSections(instanceId, currentFieldId) {
  const values = await getFieldValues(instanceId);
  const order = ['summary_text', 's1_1_text', 's1_2_text', 's1_3_text',
    's2_1_1_text', 's2_1_2_text', 's2_1_4_text', 's2_2_1_text', 's2_2_2_text',
    's3_1_text', 's3_2_text', 's3_3_text', 's4_1_text', 's4_2_text'];

  const sectionNames = {
    'summary_text': 'Project Summary', 's1_1_text': '1.1 Background',
    's1_2_text': '1.2 Needs & Objectives', 's1_3_text': '1.3 Innovation & EU Value',
    's2_1_1_text': '2.1.1 Methodology', 's2_1_2_text': '2.1.2 Management & QA',
    's2_1_4_text': '2.1.4 Cost Effectiveness', 's2_2_1_text': '2.2.1 Consortium Setup',
    's2_2_2_text': '2.2.2 Consortium Management', 's3_1_text': '3.1 Impact',
    's3_2_text': '3.2 Dissemination', 's3_3_text': '3.3 Sustainability',
    's4_1_text': '4.1 Work Plan', 's4_2_text': '4.2 Work Packages Detail',
  };

  let context = '';
  for (const fid of order) {
    if (fid === currentFieldId) break;
    const val = values[fid];
    if (val && val.text && val.text.length > 50) {
      context += `\n--- ${sectionNames[fid] || fid} ---\n${val.text}\n`;
    }
  }
  return context;
}

// ── Main generation function ────────────────────────────────

async function generateSection(instanceId, sectionId, projectContext, programId, coordinatorName) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return '[AI generation pending — configure ANTHROPIC_API_KEY in .env]';
  }

  const sectionNames = {
    'summary_text': 'Project Summary',
    's1_1_text': '1.1 Background and general objectives',
    's1_2_text': '1.2 Needs analysis and specific objectives',
    's1_3_text': '1.3 Complementarity, innovation and European added value',
    's2_1_1_text': '2.1.1 Concept and methodology',
    's2_1_2_text': '2.1.2 Project management, quality assurance and monitoring',
    's2_1_4_text': '2.1.4 Cost effectiveness and financial management',
    's2_2_1_text': '2.2.1 Consortium set-up and cooperation',
    's2_2_2_text': '2.2.2 Consortium management and decision-making',
    's3_1_text': '3.1 Impact and ambition',
    's3_2_text': '3.2 Communication, dissemination and visibility',
    's3_3_text': '3.3 Sustainability and continuation',
    's4_1_text': '4.1 Work plan overview',
    's4_2_text': '4.2 Work packages, activities, resources and timing',
    's5_1_text': '5.1 Ethics',
    's5_2_text': '5.2 Security',
  };

  const sectionTitle = sectionNames[sectionId] || sectionId;

  // Get project ID from instance
  const [instRow] = await db.execute('SELECT project_id FROM form_instances WHERE id = ?', [instanceId]);
  const projId = instRow[0]?.project_id;

  // Gather all context in parallel (interview answers already in projectContext via buildEnrichedContext)
  const [ragChunks, writingRules, evalGuidance, previousSections, researchChunks] = await Promise.all([
    programId ? retrieveRelevantChunks(sectionTitle, programId, 8) : Promise.resolve(''),
    programId ? getWritingRules(programId) : Promise.resolve({}),
    getEvalGuidanceForSection(sectionId),
    getPreviousSections(instanceId, sectionId),
    projId ? retrieveResearchChunks(sectionTitle, projId, 6) : Promise.resolve(''),
  ]);

  console.log(`[Writer] writingRules loaded: style=${writingRules.writing_style ? writingRules.writing_style.length + ' chars' : 'NULL'}, ai=${writingRules.ai_detection_rules ? writingRules.ai_detection_rules.length + ' chars' : 'NULL'}, evalGuidance=${evalGuidance ? evalGuidance.length + ' chars' : 'NONE'}, RAG=${ragChunks ? ragChunks.length + ' chars' : 'NONE'}, prevSections=${previousSections ? previousSections.length + ' chars' : 'NONE'}`);

  // Build system prompt — writing rules FIRST (highest priority)
  let system = `You are a real project coordinator writing a funding proposal. You are NOT an AI assistant — you are a practitioner who has spent months designing this project with your partners. You write from lived experience, not from templates.

PERSONA: You are the project coordinator at ${coordinatorName || 'the lead organisation'}. You know every partner personally. You have visited their offices, discussed the project over coffee, argued about methodology in video calls. Write like that person — with conviction, specificity, and occasional imperfection.

SECTION TO WRITE: "${sectionTitle}"
LENGTH: 500-700 words. Quality over quantity.
OUTPUT: Only the section text. No title, no numbering, no meta-commentary.`;

  // Writing style rules — MANDATORY, highest priority
  if (writingRules.writing_style) {
    system += `\n\n══ WRITING STYLE (FOLLOW STRICTLY) ══\n${writingRules.writing_style}`;
  }

  // AI detection rules — MANDATORY
  if (writingRules.ai_detection_rules) {
    system += `\n\n══ ANTI-AI DETECTION (MANDATORY — YOUR TEXT WILL BE SCANNED) ══\n${writingRules.ai_detection_rules}`;
  }

  // Anti-generic rules
  system += `\n\n══ WHAT MAKES A BAD PROPOSAL (AVOID ALL OF THIS) ══
- Starting with "The [project name] project addresses..." — find a different, unexpected opening
- Listing EU policy frameworks without connecting them to YOUR specific work
- Using "innovative" without explaining WHAT is new and WHY existing approaches failed
- Writing "the consortium brings together complementary expertise" — instead, tell a STORY about why each partner matters
- Generic percentages ("20% of European youth") without connecting to YOUR target communities
- Describing WPs as a bureaucratic list instead of showing how activities flow into each other
- Every paragraph having the same length and structure
- Buzzword chains: "comprehensive, sustainable, innovative, transnational framework"
- Passive voice: "activities will be implemented" — use active: "CESIE leads the pilot workshops in Palermo"
- Round numbers for everything (500 participants, 120 trained, 2000 reached) — use real estimates

══ WHAT MAKES A WINNING PROPOSAL (DO ALL OF THIS) ══
- Open with a REAL story, a specific problem, or a provocative fact about YOUR communities
- Name specific neighbourhoods, schools, youth centres — not just cities
- Show the HUMAN dimension: who are the young people? what do they face daily?
- Describe your methodology as a JOURNEY, not a checklist
- Each partner should appear with their UNIQUE contribution, not interchangeable roles
- Include ONE surprising or counterintuitive element that shows original thinking
- Reference prior experience with SPECIFIC lessons learned, not generic "track record"
- Use numbers that come from YOUR needs assessment, not EU-level statistics
- Write as if explaining to a colleague, not a bureaucrat
- Vary paragraph length dramatically: one 5-line paragraph, then a 2-line paragraph, then 4 lines`;

  // Build user prompt
  let user = `══ YOUR PROJECT ══\n${projectContext}`;

  if (evalGuidance) {
    user += `\n\n══ WHAT THE EVALUATOR SCORES IN THIS SECTION ══\n${evalGuidance}\nAddress ALL of these points, but naturally woven into the narrative — not as a checklist.`;
  }

  // RAG — but limit to most relevant chunks to avoid dilution
  if (ragChunks) {
    const limitedRag = ragChunks.substring(0, 8000);
    user += `\n\n══ REFERENCE DOCUMENTS (cite naturally, don't list) ══\n${limitedRag}`;
  }

  // NOTE: Interview answers are now included in projectContext via buildEnrichedContext()

  // Add research document chunks (user's thematic evidence — priority over call docs)
  if (researchChunks) {
    user += `\n\n══ THEMATIC RESEARCH (uploaded by coordinator — use as primary evidence) ══\n${researchChunks}`;
  }

  if (previousSections) {
    user += `\n\n══ WHAT YOU ALREADY WROTE (don't repeat, build on it) ══\n${previousSections}`;
  }

  const seed = Math.random().toString(36).substring(2, 8);
  user += `\n\n══ NOW WRITE ══\nWrite section "${sectionTitle}" for this specific project. Use the coordinator's own words and research documents as your primary material. The call documents are secondary context. Write with conviction and specificity. [v:${seed}]`;

  return await callAI(system, user, 'generate');
}

// ── Evaluate section with full criteria context ─────────────

async function evaluateSection(text, sectionTitle, criteria, programId) {
  if (!process.env.ANTHROPIC_API_KEY) return { score: 'pending', feedback: 'API key not configured' };

  const writingRules = programId ? await getWritingRules(programId) : {};

  const system = `You are a senior Erasmus+ proposal evaluator with extensive experience scoring EU project applications. You evaluate rigorously but constructively.

Evaluate the section text below. Score each aspect and provide actionable feedback.

Respond ONLY in valid JSON:
{
  "overall": "excellent|good|fair|weak",
  "score_estimate": 8,
  "strengths": ["specific strength 1", "specific strength 2"],
  "weaknesses": ["specific weakness 1"],
  "suggestions": ["actionable improvement 1", "actionable improvement 2", "actionable improvement 3"],
  "missing_elements": ["element the evaluator would expect but is missing"],
  "word_count_ok": true
}`;

  let user = `Section: ${sectionTitle}\n\n`;
  if (writingRules.writing_style) user += `Expected writing style:\n${writingRules.writing_style}\n\n`;
  user += `Text to evaluate:\n${text}`;

  const result = await callClaude(system, user, 2000);
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { overall: 'unknown', feedback: result };
  } catch { return { overall: 'unknown', feedback: result }; }
}

// ── Improve section with context awareness ──────────────────

async function improveSection(text, action, sectionTitle, projectContext, programId) {
  if (!process.env.ANTHROPIC_API_KEY) return text;

  const writingRules = programId ? await getWritingRules(programId) : {};

  const actions = {
    expand: 'Expand this text with MORE SPECIFIC details from the project data. Add concrete examples, data points, partner contributions, and activity specifics. Reference official EU documents and policy frameworks where relevant. Double the depth without doubling the length.',
    simplify: 'Make this text more concise and impactful. Remove redundant phrases, tighten the language, and improve readability. Keep all essential content but reduce word count by ~20%. Every sentence must earn its place.',
    improve: 'Strengthen this text to score higher with EU evaluators. Improve: (1) specificity — use more project-specific data, (2) evidence — reference EU policies and official documents, (3) coherence — better flow between paragraphs, (4) evaluation alignment — address criteria more explicitly.',
  };

  let system = `You are an expert Erasmus+ proposal writer revising a section. Return ONLY the improved text — no explanations, no commentary, no section titles.`;
  if (writingRules.writing_style) system += `\n\nFollow this writing style:\n${writingRules.writing_style}`;
  if (writingRules.ai_detection_rules) system += `\n\nAI detection rules:\n${writingRules.ai_detection_rules}`;

  let user = `Section: ${sectionTitle}\n\nInstruction: ${actions[action] || actions.improve}`;
  if (projectContext) user += `\n\nProject context for reference:\n${projectContext.substring(0, 3000)}`;
  user += `\n\nOriginal text to improve:\n${text}`;

  return await callClaude(system, user, 4096);
}

// ============ PREP STUDIO v2: 5-TAB CONTEXT ============

// ── Tab 1: Consorcio ──

async function getPrepConsorcio(projectId, userId) {
  // Get partners with organization link
  const [partners] = await db.execute(
    `SELECT p.id, p.name, p.legal_name, p.city, p.country, p.role, p.order_index, p.organization_id
     FROM partners p WHERE p.project_id = ? ORDER BY p.order_index`,
    [projectId]
  );

  for (const p of partners) {
    p.organization = null;
    p.variants = [];
    p.selected_variant = null;
    p.custom_text = null;

    if (p.organization_id) {
      // Load org profile
      const [orgs] = await db.execute(
        `SELECT id, organization_name, acronym, org_type, country, city, description, activities_experience, expertise_areas, staff_size
         FROM organizations WHERE id = ?`, [p.organization_id]
      );
      if (orgs.length) {
        p.organization = orgs[0];
        // Load child tables
        const [staff] = await db.execute('SELECT name, role, skills_summary FROM org_key_staff WHERE organization_id = ?', [p.organization_id]);
        p.organization.key_staff = staff;
        const [euProj] = await db.execute('SELECT programme, year, project_id_or_contract, role, title FROM org_eu_projects WHERE organization_id = ?', [p.organization_id]);
        p.organization.eu_projects = euProj;
        const [stakeholders] = await db.execute('SELECT entity_name, entity_type, relationship_type, description FROM org_stakeholders WHERE organization_id = ?', [p.organization_id]);
        p.organization.stakeholders = stakeholders;
      }

      // Load PIF variants for this organization
      const [variants] = await db.execute(
        'SELECT id, category, category_label, source, updated_at FROM org_pif_variants WHERE organization_id = ? ORDER BY category',
        [p.organization_id]
      );
      p.variants = variants;
    }

    // Load project-specific PIF selection
    const [pifs] = await db.execute(
      `SELECT pp.variant_id, pp.custom_text, v.adapted_text, v.category, v.category_label
       FROM project_partner_pifs pp
       LEFT JOIN org_pif_variants v ON v.id = pp.variant_id
       WHERE pp.project_id = ? AND pp.partner_id = ?`,
      [projectId, p.id]
    );
    if (pifs.length) {
      p.custom_text = pifs[0].custom_text;
      if (pifs[0].variant_id) {
        p.selected_variant = { id: pifs[0].variant_id, adapted_text: pifs[0].adapted_text, category: pifs[0].category, category_label: pifs[0].category_label };
      }
    }
  }

  return { partners };
}

async function linkPartnerOrg(projectId, partnerId, organizationId) {
  await db.execute(
    'UPDATE partners SET organization_id = ? WHERE id = ? AND project_id = ?',
    [organizationId, partnerId, projectId]
  );
}

async function generatePifVariant(projectId, partnerId, category, categoryLabel, userId) {
  // Get partner + org + project context
  const [partners] = await db.execute(
    'SELECT p.*, o.organization_name, o.description, o.activities_experience, o.expertise_areas FROM partners p LEFT JOIN organizations o ON o.id = p.organization_id WHERE p.id = ? AND p.project_id = ?',
    [partnerId, projectId]
  );
  if (!partners.length || !partners[0].organization_id) throw new Error('Partner not linked to organization');
  const partner = partners[0];
  const orgId = partner.organization_id;

  // Load org child data
  const [staff] = await db.execute('SELECT name, role, skills_summary FROM org_key_staff WHERE organization_id = ?', [orgId]);
  const [euProj] = await db.execute('SELECT programme, year, role, title FROM org_eu_projects WHERE organization_id = ?', [orgId]);
  const [stakeholders] = await db.execute('SELECT entity_name, relationship_type FROM org_stakeholders WHERE organization_id = ?', [orgId]);

  // Load project context
  const ctx = await getProjectContext(projectId, userId);
  if (!ctx) throw new Error('Project not found');

  const leaderWps = (ctx.wps || []).filter(wp => wp.leader_id === partnerId);

  const systemPrompt = `You are an expert at adapting organizational profiles (PIFs) for EU project proposals.
You receive: (1) the generic organization profile, (2) the project's theme and context.
Your task: rewrite the organization's profile as a complete PIF adapted to THIS project's theme: "${categoryLabel || category}".

Rules:
- Keep all factual information (staff numbers, years of experience, project titles)
- Reframe the organization's experience to highlight relevance to the project theme
- Include relevant staff and their roles adapted to the project
- Include past EU projects that are most relevant
- Maintain professional EU proposal tone
- Write in the SAME LANGUAGE as the project description (Spanish if project is in Spanish, etc.)
- Do NOT invent capabilities the organization doesn't have
- DO emphasize existing capabilities that connect to the project theme
- Output a single cohesive text of ~300-400 words`;

  const userPrompt = `ORGANIZATION PROFILE:
Name: ${partner.organization_name}
Description: ${partner.description || 'Not available'}
Experience: ${partner.activities_experience || 'Not available'}
Expertise areas: ${partner.expertise_areas || 'Not available'}

KEY STAFF:
${staff.map(s => `- ${s.name} (${s.role}): ${s.skills_summary || ''}`).join('\n') || 'None listed'}

PAST EU PROJECTS:
${euProj.map(ep => `- ${ep.title || ep.programme} (${ep.year}, role: ${ep.role})`).join('\n') || 'None listed'}

STAKEHOLDERS:
${stakeholders.map(sh => `- ${sh.entity_name} (${sh.relationship_type})`).join('\n') || 'None listed'}

PROJECT CONTEXT:
Title: ${ctx.project.name}
Description: ${ctx.project.description || ''}
Problem: ${ctx.context?.problem || 'Not specified'}
Approach: ${ctx.context?.approach || 'Not specified'}
Target groups: ${ctx.context?.target_groups || 'Not specified'}
This partner's role: ${partner.role}
${leaderWps.length ? `WPs led by this partner: ${leaderWps.map(wp => wp.code + ' ' + wp.title).join(', ')}` : ''}

ADAPTATION THEME: ${categoryLabel || category}

Write the adapted PIF now.`;

  // Call AI (uses local callAI: Gemini for generation, Claude fallback)
  const adaptedText = await callAI(systemPrompt, userPrompt, 'generate');

  // Save or update variant in org_pif_variants
  const variantId = genUUID();
  await db.execute(
    `INSERT INTO org_pif_variants (id, organization_id, category, category_label, adapted_text, source)
     VALUES (?, ?, ?, ?, ?, 'ai')
     ON DUPLICATE KEY UPDATE adapted_text = VALUES(adapted_text), category_label = VALUES(category_label), source = 'ai'`,
    [variantId, orgId, category, categoryLabel || null, adaptedText]
  );

  // Get the actual ID (might be existing on duplicate)
  const [inserted] = await db.execute(
    'SELECT id FROM org_pif_variants WHERE organization_id = ? AND category = ?', [orgId, category]
  );
  const actualId = inserted[0]?.id || variantId;

  // Auto-select this variant for the partner in this project
  await db.execute(
    `INSERT INTO project_partner_pifs (id, project_id, partner_id, variant_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE variant_id = VALUES(variant_id)`,
    [genUUID(), projectId, partnerId, actualId]
  );

  return { variant_id: actualId, adapted_text: adaptedText, category, category_label: categoryLabel };
}

async function selectPifVariant(projectId, partnerId, variantId) {
  await db.execute(
    `INSERT INTO project_partner_pifs (id, project_id, partner_id, variant_id)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE variant_id = VALUES(variant_id), custom_text = NULL`,
    [genUUID(), projectId, partnerId, variantId]
  );
}

// ── Tab 2: Presupuesto ──

async function getPrepPresupuesto(projectId) {
  const [budgets] = await db.execute(
    'SELECT id, name, max_grant, cofin_pct, indirect_pct, status FROM budget_projects WHERE project_id = ? LIMIT 1',
    [projectId]
  );
  if (!budgets.length) return null;
  const budget = budgets[0];

  // Beneficiaries with cost sums by category
  const [bens] = await db.execute(
    `SELECT bb.id, bb.name, bb.acronym, bb.country, bb.is_coordinator, bb.sort_order,
       COALESCE(SUM(CASE WHEN bc.category = 'A' THEN bc.total_cost ELSE 0 END), 0) as cat_a,
       COALESCE(SUM(CASE WHEN bc.category = 'B' THEN bc.total_cost ELSE 0 END), 0) as cat_b,
       COALESCE(SUM(CASE WHEN bc.category = 'C' THEN bc.total_cost ELSE 0 END), 0) as cat_c,
       COALESCE(SUM(CASE WHEN bc.category = 'D' THEN bc.total_cost ELSE 0 END), 0) as cat_d,
       COALESCE(SUM(bc.total_cost), 0) as total
     FROM budget_beneficiaries bb
     LEFT JOIN budget_costs bc ON bc.beneficiary_id = bb.id AND bc.budget_id = bb.budget_id
     WHERE bb.budget_id = ?
     GROUP BY bb.id ORDER BY bb.sort_order`,
    [budget.id]
  );

  // WP sums
  const [wps] = await db.execute(
    `SELECT bw.id, bw.number, bw.label, bw.sort_order,
       COALESCE(SUM(bc.total_cost), 0) as total
     FROM budget_work_packages bw
     LEFT JOIN budget_costs bc ON bc.wp_id = bw.id AND bc.budget_id = bw.budget_id
     WHERE bw.budget_id = ?
     GROUP BY bw.id ORDER BY bw.sort_order`,
    [budget.id]
  );

  return { budget, beneficiaries: bens, work_packages: wps };
}

// ── Tab 3: Relevancia ──

async function getPrepRelevancia(projectId) {
  const [contexts] = await db.execute(
    'SELECT problem, target_groups, approach FROM intake_contexts WHERE project_id = ? LIMIT 1',
    [projectId]
  );
  return { context: contexts[0] || { problem: '', target_groups: '', approach: '' } };
}

async function updatePrepRelevanciaContext(projectId, problem, targetGroups, approach) {
  // Check if context exists
  const [existing] = await db.execute('SELECT id FROM intake_contexts WHERE project_id = ?', [projectId]);
  if (existing.length) {
    await db.execute(
      'UPDATE intake_contexts SET problem = ?, target_groups = ?, approach = ? WHERE project_id = ?',
      [problem, targetGroups, approach, projectId]
    );
  } else {
    await db.execute(
      'INSERT INTO intake_contexts (id, project_id, problem, target_groups, approach) VALUES (?, ?, ?, ?, ?)',
      [genUUID(), projectId, problem, targetGroups, approach]
    );
  }
}

// ── Tab 4: Actividades ──

async function getPrepActividades(projectId) {
  const [wps] = await db.execute(
    `SELECT wp.id, wp.order_index, wp.code, wp.title, wp.category, wp.leader_id, wp.summary, p.name as leader_name
     FROM work_packages wp LEFT JOIN partners p ON p.id = wp.leader_id
     WHERE wp.project_id = ? ORDER BY wp.order_index`,
    [projectId]
  );

  for (const wp of wps) {
    const [acts] = await db.execute(
      `SELECT a.id, a.type, a.label, a.subtype, a.description, a.date_start, a.date_end, a.online
       FROM activities a WHERE a.wp_id = ? ORDER BY a.order_index`,
      [wp.id]
    );
    for (const act of acts) {
      const [tasks] = await db.execute(
        `SELECT title, description, deliverable, milestone, kpi, status, start_month, end_month
         FROM project_tasks WHERE wp_id = ? AND category = ? ORDER BY sort_order`,
        [wp.id, act.type || 'general']
      );
      act.tasks = tasks;
    }
    wp.activities = acts;
  }

  return { wps };
}

async function updateWpSummary(wpId, summary) {
  await db.execute('UPDATE work_packages SET summary = ? WHERE id = ?', [summary, wpId]);
}

async function updateActivityDescription(activityId, description) {
  await db.execute('UPDATE activities SET description = ? WHERE id = ?', [description, activityId]);
}

module.exports = {
  getProjectContext,
  getOrCreateInstance,
  getInstance,
  updateInstanceStatus,
  getFieldValues,
  saveFieldValue,
  saveFieldValuesBulk,
  getEvalCriteria,
  buildProjectContext,
  buildEnrichedContext,
  // Prep Studio
  getInterviewAnswers,
  saveInterviewAnswer,
  generateInterviewQuestions,
  getResearchDocs,
  addResearchDoc,
  removeResearchDoc,
  getGapAnalysis,
  generateSection,
  evaluateSection,
  improveSection,
  retrieveRelevantChunks,
  getWritingRules,
  // Prep Studio v2
  getPrepConsorcio,
  linkPartnerOrg,
  generatePifVariant,
  selectPifVariant,
  getPrepPresupuesto,
  getPrepRelevancia,
  updatePrepRelevanciaContext,
  getPrepActividades,
  updateWpSummary,
  updateActivityDescription,
};
