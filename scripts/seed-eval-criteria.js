/**
 * Seed evaluation criteria for KA3 Youth Together
 * 5+ criteria per question, based on Programme Guide and evaluation methodology
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const Q = {
  '409e7ed8-7828-4952-bd8c-8bf778a8fe06': { code: '1.1', title: 'Background and general objectives', criteria: [
    { title: 'Call relevance & priorities', meaning: 'Maps to Eval Criterion 1 (Relevance, 30pts). Evaluates whether the project directly addresses the specific priorities and scope of the KA3 Youth Together call. Strong: names 2-3 call priorities and shows how each WP connects. Weak: generic reference to "Erasmus+ objectives" without call specifics. Differentiator: direct quotes from Programme Guide linking to project activities.', structure: 'Open with narrative connecting project rationale to EU youth policy context. Bullet: list 3 call priorities addressed with specific project responses. Close: synthesis of how priorities interlock.', relations: 'Must align with 1.2 objectives, 1.3 EU added value, and 3.1 impact ambitions. Eval Criterion 1 also scored via 1.2 and 1.3.', rules: 'Must reference at least 2 specific call priorities from Programme Guide. Generic mentions insufficient.', red_flags: 'Copy-paste from call text without project-specific connection. No reference to Programme Guide. Mentioning priorities from wrong call/action type.', score_rubric: '{"0":"Not addressed","25":"Generic Erasmus+ reference only","50":"Names priorities but weak connection to project","75":"Clear priority mapping with evidence","100":"Comprehensive, with Programme Guide references and WP-level connections"}', max_score: 2.0, mandatory: 0 },
    { title: 'Background & rationale', meaning: 'Maps to Eval Criterion 1. Evaluates the quality of contextual analysis — whether the project is grounded in real evidence about the problem it addresses. Strong: cites 3+ sources (EU data, national reports, grassroots evidence). Weak: vague claims about "youth challenges in Europe". Differentiator: local-level data from partner countries alongside EU-level statistics.', structure: 'Narrative: paint the picture of the problem with real data. Bullets: 3 evidence sources (EU, national, local). Narrative: connect to why this consortium is positioned to respond.', relations: 'Feeds into 1.2 needs analysis. Must be consistent with 2.2.1 consortium justification and 3.1 impact claims.', rules: 'Evidence must be recent (within 5 years). At least one EU-level and one national-level source required.', red_flags: 'No data or statistics. All evidence from one country only. Outdated sources (pre-2020). Claims without attribution.', score_rubric: '{"0":"No background","25":"Generic context, no data","50":"Some data but single-source","75":"Multi-level evidence, recent","100":"Compelling narrative with EU + national + local data from partner countries"}', max_score: 2.0, mandatory: 0 },
    { title: 'General objectives clarity', meaning: 'Maps to Eval Criterion 1. Evaluates whether the project has a clear overarching goal that logically flows from the background analysis. Strong: one main goal with 3 specific sub-goals, each traceable to identified needs. Weak: list of 6+ vague objectives. Differentiator: Rule of Three — exactly 3 well-defined objectives.', structure: 'Narrative: state the main goal in one powerful sentence. Bullets: 3 specific objectives with measurable indicators. Narrative: explain how objectives address the identified gap.', relations: 'Objectives must map 1:1 to needs in 1.2, activities in 4.2, and expected results in 3.1. Evaluators cross-check this alignment.', rules: 'Objectives must be SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Each objective needs at least one indicator.', red_flags: 'More than 5 objectives (unfocused). No measurable indicators. Objectives disconnected from background. Buzzword objectives without substance.', score_rubric: '{"0":"No objectives stated","25":"Vague, unmeasurable objectives","50":"Clear but not SMART, missing indicators","75":"SMART objectives with indicators, Rule of Three","100":"Perfect SMART objectives with baseline values, targets, and timeline"}', max_score: 3.0, mandatory: 0 },
    { title: 'EU policy alignment', meaning: 'Maps to Eval Criterion 1. Evaluates connection to broader EU youth policy frameworks (EU Youth Strategy 2019-2027, European Youth Goals, Inclusion & Diversity Strategy). Strong: names specific EU policy objectives and shows how project contributes. Weak: no mention of EU policy context.', structure: 'Narrative: position the project within the EU youth policy landscape. Bullets: 3 specific policy documents/objectives referenced. Narrative: explain the project contribution to these policy goals.', relations: 'Supports 1.3 EU added value. Must be consistent with 3.1 impact at European level. References should appear in dissemination strategy 3.2.', rules: 'At least 2 EU policy references required. Must be current policy frameworks (post-2019).', red_flags: 'No EU policy references. Citing outdated frameworks. Forced connections to irrelevant policies. Listing policies without explaining project contribution.', score_rubric: '{"0":"No policy context","25":"One generic EU reference","50":"2 policies mentioned but weak link","75":"3+ policies with clear project connections","100":"Deep integration with EU Youth Strategy, Youth Goals, and call-specific priorities"}', max_score: 2.0, mandatory: 0 },
    { title: 'Target group identification', meaning: 'Maps to Eval Criterion 1. Evaluates whether target groups are clearly defined with three levels: primary beneficiaries, intermediary actors, and structural/institutional targets. Strong: quantified targets per group with geographic distribution. Weak: "young people" without further specification.', structure: 'Narrative: describe who benefits and why. Bullets: 3 target group levels with numbers and profiles. Narrative: how selection criteria ensure reaching intended groups.', relations: 'Must be consistent across 1.2, 3.1 impact, 3.2 dissemination targets, and 4.2 WP participant numbers. Numbers must match budget in 2.1.4.', rules: 'Primary target group must include young people (KA3 Youth requirement). Numbers must be realistic for budget and duration.', red_flags: 'No quantification. Only one target group level. Numbers inconsistent with budget. No mention of disadvantaged or underrepresented youth.', score_rubric: '{"0":"No target groups","25":"Generic groups, no numbers","50":"Defined groups but single level","75":"Three levels with numbers","100":"Three levels, quantified, geographically distributed, with selection criteria and inclusion strategy"}', max_score: 1.0, mandatory: 0 },
  ]},
  '67f7eb95-2d5b-476c-b367-b8b78ed45383': { code: '1.2', title: 'Needs analysis', criteria: [
    { title: 'Evidence-based needs', meaning: 'Maps to Eval Criterion 1. Evaluates whether needs are grounded in concrete data from multiple sources and levels. Strong: triangulated evidence from EU statistics, national studies, and grassroots consultation. Weak: assumed needs without evidence.', structure: 'Narrative: the gap that exists. Bullets: 3 evidence sources per need. Narrative: why existing solutions are insufficient.', relations: 'Needs must trace to objectives in 1.1 and activities in 4.2. Each need should have a corresponding WP that addresses it.', rules: 'At least 3 distinct needs identified with supporting data. Sources must be cited.', red_flags: 'Needs assumed without data. Single-country perspective. No gap analysis. Needs that the project design cannot address.', score_rubric: '{"0":"No needs analysis","25":"Assumed needs, no data","50":"Some data but incomplete","75":"Multi-source evidence, clear gaps","100":"Triangulated evidence across partner countries with gap analysis"}', max_score: 3.0, mandatory: 0 },
    { title: 'Specific objectives & indicators', meaning: 'Maps to Eval Criterion 1. Each objective must have SMART indicators with unit, baseline, and target. Strong: indicator table with baselines from needs assessment. Weak: objectives without measurable outcomes.', structure: 'Narrative: how objectives flow from needs. Bullets/Table: objectives with indicator, unit, baseline, target. Narrative: verification methods.', relations: 'Each objective maps to at least one WP in 4.2. Indicators feed 2.1.2 monitoring strategy and 3.1 impact measurement.', rules: 'SMART format mandatory. Each objective needs at least one quantitative and one qualitative indicator.', red_flags: 'Non-measurable objectives. No baseline data. Unrealistic targets. Objectives not traceable to needs.', score_rubric: '{"0":"No specific objectives","25":"Vague objectives","50":"Clear but missing indicators","75":"SMART with indicators","100":"Full indicator framework with baselines, targets, and measurement methodology"}', max_score: 4.0, mandatory: 0 },
    { title: 'Needs-to-design coherence', meaning: 'Maps to Eval Criterion 1. Evaluates logical chain: identified need → objective → activity → expected result. Strong: clear mapping table showing how each need is addressed. Weak: disconnected needs and activities.', structure: 'Narrative: the intervention logic. Bullets: need-objective-activity mapping for top 3 needs. Narrative: why this approach is the most effective response.', relations: 'Core coherence check across 1.1, 1.2, 2.1.1 methodology, 4.2 WP design, and 3.1 impact.', rules: 'Every identified need must connect to at least one project activity. No orphan needs or orphan activities.', red_flags: 'Needs listed but not addressed in work plan. Activities that do not respond to any identified need. Logical gaps in intervention chain.', score_rubric: '{"0":"No coherence visible","25":"Partial connections","50":"Most needs connected but gaps","75":"Clear mapping with minor gaps","100":"Complete intervention logic with needs-objectives-activities-results chain"}', max_score: 3.0, mandatory: 0 },
  ]},
  '77b5b37c-9ee2-436e-b546-bf2b3dd3f8d1': { code: '1.3', title: 'Innovation & EU added value', criteria: [
    { title: 'Innovation dimension', meaning: 'Maps to Eval Criterion 1. Innovation can be new methods, new contexts, new target groups, or new combinations. Strong: clearly articulates what is new AND why existing approaches are insufficient. Weak: claims innovation without explaining what exists.', structure: 'Narrative: state of the art. Bullets: 3 innovative elements. Narrative: why innovation matters for this context.', relations: 'Innovation claims must be supported by methodology in 2.1.1 and reflected in outputs/results in 3.1.', rules: 'Must explain innovation relative to existing practice. "First of its kind" claims need evidence.', red_flags: 'Calling standard practices innovative. No reference to existing approaches. Innovation disconnected from project needs.', score_rubric: '{"0":"No innovation","25":"Claims without context","50":"Some novelty but unclear added value","75":"Clear innovation with evidence of gap","100":"Compelling innovation narrative with state-of-art analysis and clear differentiation"}', max_score: 3.0, mandatory: 0 },
    { title: 'European added value', meaning: 'Maps to Eval Criterion 1. Why this project MUST be transnational — what cannot be achieved at national level. Strong: specific transnational mechanisms (comparative research, cross-border exchanges, joint methodology). Weak: "partners from different countries."', structure: 'Narrative: why national action is insufficient. Bullets: 3 transnational dimensions. Narrative: synthesis of European dimension.', relations: 'Must be consistent with 2.2.1 consortium rationale and 3.1 European-level impact.', rules: 'Must demonstrate why the project requires partners from multiple countries. KA3 requires minimum 5 partners from 5 countries.', red_flags: 'No explanation of why transnational. Activities that could be done nationally. No cross-border learning mechanisms.', score_rubric: '{"0":"No EU dimension","25":"Partners listed but no rationale","50":"Some transnational elements","75":"Clear European dimension with mechanisms","100":"Compelling case for transnational cooperation with specific cross-border value-add per WP"}', max_score: 3.0, mandatory: 0 },
    { title: 'Complementarity & prior work', meaning: 'Maps to Eval Criterion 1. How project builds on existing work and complements other initiatives. Strong: specific project references with lessons learned. Weak: no reference to prior work.', structure: 'Narrative: what has been done before. Bullets: 3 prior projects/initiatives with specific lessons. Narrative: how this project builds on and goes beyond.', relations: 'Partners prior experience in 2.2.1. Sustainability in 3.3 may reference continuation of prior work.', rules: 'At least 2 references to prior EU-funded or relevant projects. Lessons learned must be specific.', red_flags: 'No prior project references. Claiming to start from zero. Duplicating existing projects without acknowledgment.', score_rubric: '{"0":"No references","25":"Generic mention of field","50":"Some references but no lessons","75":"Specific projects with lessons applied","100":"Comprehensive analysis of landscape with clear positioning and value-add"}', max_score: 4.0, mandatory: 0 },
  ]},
  '08d78102-2186-42c4-9587-8c6dde595354': { code: '2.1.1', title: 'Concept and methodology', criteria: [
    { title: 'Methodological framework', meaning: 'Maps to Eval Criterion 2 (Quality, 30pts). Evaluates whether the project has a coherent methodological approach that justifies WHY chosen methods are most appropriate. Strong: named methodology with adaptation rationale. Weak: list of activities without theoretical grounding.', structure: 'Narrative: methodological approach. Bullets: 3 key methodological components. Narrative: why this approach for this context.', relations: 'Must align with objectives in 1.2, activities in 4.2, and consortium expertise in 2.2.1.', rules: 'Methodology must be described, not just activities. Must explain WHY this approach.', red_flags: 'Activity list instead of methodology. No justification for chosen approach. Methodology not suited to target groups.', score_rubric: '{"0":"No methodology","25":"Activity list only","50":"Some method but no rationale","75":"Clear framework with justification","100":"Comprehensive methodology with theoretical basis, adaptation to context, and innovation"}', max_score: 3.0, mandatory: 0 },
    { title: 'Activity design quality', meaning: 'Maps to Eval Criterion 2. Evaluates coherence and quality of planned activities. Strong: activities clearly linked to objectives with clear outputs and participant profiles. Weak: generic activities without specifics.', structure: 'Narrative: how activities form a coherent programme. Bullets: key activities per WP with outputs. Narrative: logical sequence and interdependencies.', relations: 'Activities must match 4.2 WP descriptions, budget in 2.1.4, and timeline. Outputs feed 3.1 impact.', rules: 'Each WP must have clear activities with deliverables. Participant numbers must be realistic.', red_flags: 'Activities without outputs. Disconnected activities. Unrealistic scope for duration/budget.', score_rubric: '{"0":"No activities described","25":"Generic activities","50":"Some specifics but gaps","75":"Well-designed activities with outputs","100":"Comprehensive activity design with clear inputs-outputs-outcomes chain per WP"}', max_score: 3.0, mandatory: 0 },
    { title: 'Non-formal learning approach', meaning: 'Maps to Eval Criterion 2. KA3 Youth projects must use non-formal and informal learning methods. Strong: specific NFE methods named with learning outcomes. Weak: traditional classroom/lecture approaches only.', structure: 'Narrative: NFE philosophy. Bullets: 3 specific NFE methods used. Narrative: expected learning outcomes.', relations: 'Must be reflected in 2.1.3 staff competencies and 4.2 activity descriptions.', rules: 'KA3 Youth requires non-formal learning approaches. Must demonstrate youth participation in design.', red_flags: 'Purely formal education methods. No mention of youth participation. No specific NFE tools named.', score_rubric: '{"0":"No NFE approach","25":"Mentioned but not described","50":"Some NFE elements","75":"Clear NFE framework with methods","100":"Comprehensive NFE approach with youth co-design, specific tools, and learning outcomes"}', max_score: 2.0, mandatory: 0 },
    { title: 'Inclusion & accessibility', meaning: 'Maps to Eval Criterion 2. How the project ensures participation of disadvantaged youth and addresses barriers. Strong: specific inclusion measures per barrier type. Weak: no mention of inclusion.', structure: 'Narrative: inclusion philosophy. Bullets: 3 barrier types with specific measures. Narrative: how inclusion is monitored.', relations: 'Connects to Inclusion & Diversity Strategy. Must be reflected in 1.1 target groups and 2.1.4 budget allocation.', rules: 'Erasmus+ horizontal priority. Must address at least financial, geographic, and social barriers.', red_flags: 'No inclusion strategy. Token mention without concrete measures. Budget does not reflect inclusion costs.', score_rubric: '{"0":"No inclusion","25":"Token mention","50":"Some measures but incomplete","75":"Comprehensive with 3 barrier types","100":"Embedded inclusion with specific measures, budget, monitoring, and intersectional approach"}', max_score: 1.0, mandatory: 0 },
    { title: 'Digital & green dimensions', meaning: 'Maps to Eval Criterion 2. How project addresses digital transformation and environmental sustainability (Erasmus+ horizontal priorities). Strong: specific digital tools and green measures. Weak: no mention.', structure: 'Narrative: digital and green integration. Bullets: 3 measures each. Narrative: how these enhance project quality.', relations: 'Must be reflected in activities 4.2 and dissemination 3.2. Green measures in travel/event planning.', rules: 'Erasmus+ horizontal priorities. Should be addressed even if not main focus.', red_flags: 'Complete absence of digital/green. Greenwashing without concrete measures.', score_rubric: '{"0":"Not addressed","25":"Token mention","50":"Some measures","75":"Integrated approach","100":"Digital and green embedded throughout with specific tools, metrics, and OER commitment"}', max_score: 1.0, mandatory: 0 },
  ]},
  '6edf9efe-9b10-4a96-a8ef-d819686daa05': { code: '2.1.2', title: 'Project management & QA', criteria: [
    { title: 'Management structure', meaning: 'Maps to Eval Criterion 2. Clear governance with roles, responsibilities, and decision-making processes. Strong: organigram with named roles per partner. Weak: "the coordinator will manage the project."', structure: 'Narrative: governance model. Bullets: key roles with responsibilities. Narrative: how structure ensures efficiency.', relations: 'Must align with 2.2.2 consortium management and 4.2 WP leadership assignments.', rules: 'Coordinator must retain overall responsibility. No subcontracting of core management.', red_flags: 'No clear roles. All management on coordinator. No steering committee or advisory structure.', score_rubric: '{"0":"No structure","25":"Minimal description","50":"Basic roles defined","75":"Clear structure with accountability","100":"Comprehensive governance with steering committee, WP leaders, advisory board, and escalation procedures"}', max_score: 2.0, mandatory: 0 },
    { title: 'Quality assurance plan', meaning: 'Maps to Eval Criterion 2. Specific QA mechanisms, tools, and timeline. Strong: named QA tools with frequency and responsible persons. Weak: "quality will be ensured."', structure: 'Narrative: QA philosophy. Bullets: 3 QA mechanisms with tools and timing. Narrative: how QA feeds into adaptation.', relations: 'QA findings feed 2.1.5 risk mitigation. QA reports referenced in 3.1 impact evidence.', rules: 'Must include both internal and external quality measures.', red_flags: 'No specific QA tools. No timeline for QA activities. QA not budgeted.', score_rubric: '{"0":"No QA","25":"Mentioned without tools","50":"Some tools described","75":"Comprehensive QA plan with tools and timeline","100":"Full QA framework with internal + external evaluation, feedback loops, and adaptive management"}', max_score: 2.0, mandatory: 0 },
    { title: 'Monitoring & evaluation', meaning: 'Maps to Eval Criterion 2. How progress is tracked and outcomes measured. Strong: M&E framework with indicators, tools, and reporting schedule. Weak: no monitoring mentioned.', structure: 'Narrative: M&E approach. Bullets: key indicators with measurement tools and frequency. Narrative: how M&E drives project adaptation.', relations: 'Indicators must trace back to 1.2 objectives. M&E data feeds 3.1 impact assessment and final reporting.', rules: 'Must include both quantitative and qualitative indicators. Pre-post measurement for outcomes.', red_flags: 'No indicators. Only output indicators (no outcomes). No baseline measurement. No qualitative dimension.', score_rubric: '{"0":"No M&E","25":"Outputs only","50":"Some indicators but incomplete","75":"Comprehensive M&E with mixed methods","100":"Full M&E framework with Theory of Change, baseline, midterm, final, and follow-up measurement"}', max_score: 2.0, mandatory: 0 },
    { title: 'Communication plan (internal)', meaning: 'Maps to Eval Criterion 2. How partners communicate, share documents, make decisions. Strong: named tools, meeting schedule, reporting deadlines. Weak: "partners will communicate regularly."', structure: 'Narrative: communication philosophy. Bullets: tools, meeting schedule, reporting. Narrative: how communication ensures cohesion.', relations: 'Feeds 2.2.2 decision-making. Distinct from 3.2 external communication/dissemination.', rules: 'Must specify communication tools and frequency. Online meeting schedule required.', red_flags: 'No specific tools. No meeting schedule. Confusion between internal communication and external dissemination.', score_rubric: '{"0":"Nothing","25":"Generic mention","50":"Tools listed but no schedule","75":"Clear plan with tools and timing","100":"Comprehensive internal communication strategy with escalation procedures and document management"}', max_score: 1.0, mandatory: 0 },
    { title: 'Reporting & financial control', meaning: 'Maps to Eval Criterion 2. How financial management and reporting to EACEA is organized. Strong: named responsible persons, reporting timeline, audit procedures. Weak: no mention of financial control.', structure: 'Narrative: financial management approach. Bullets: reporting milestones, control mechanisms. Narrative: compliance with EU financial regulations.', relations: 'Connects to 2.1.4 cost effectiveness and 2.2.2 consortium management.', rules: 'Must comply with EU financial regulation. Coordinator bears financial responsibility.', red_flags: 'No financial control mechanisms. No reporting timeline. Budget management delegated without oversight.', score_rubric: '{"0":"Not addressed","25":"Basic mention","50":"Some mechanisms","75":"Clear control framework","100":"Comprehensive financial management with internal audit, partner reporting, and EU compliance procedures"}', max_score: 1.0, mandatory: 0 },
  ]},
};

// Shorter criteria for remaining questions
const Q2 = {
  '92e5c93f-b2f4-4675-9cf6-a057261009e2': { code: '2.1.3', criteria: [
    { title: 'Staff competence & profiles', max_score: 2.0 }, { title: 'Team diversity & complementarity', max_score: 2.0 },
    { title: 'CV evidence & track record', max_score: 2.0 }, { title: 'Youth worker development', max_score: 1.0 }, { title: 'Expert engagement strategy', max_score: 1.0 },
  ]},
  '009bcefe-e3bd-4762-90c4-637b4d2f7708': { code: '2.1.4', criteria: [
    { title: 'Budget-activity alignment', max_score: 2.0 }, { title: 'Value for money', max_score: 2.0 },
    { title: 'Financial management procedures', max_score: 2.0 }, { title: 'Resource distribution equity', max_score: 1.0 }, { title: 'Co-financing & in-kind contributions', max_score: 1.0 },
  ]},
  '33b216a9-43ed-4f0f-96fc-8320ceb6ef84': { code: '2.1.5', criteria: [
    { title: 'Risk identification completeness', max_score: 2.0 }, { title: 'Mitigation measure specificity', max_score: 2.0 },
    { title: 'Risk ownership & monitoring', max_score: 1.0 }, { title: 'Contingency planning', max_score: 1.0 }, { title: 'Risk-WP mapping', max_score: 1.0 },
  ]},
  'e27cea8e-7423-45c7-8aa6-7517e663059e': { code: '2.2.1', criteria: [
    { title: 'Partner expertise & complementarity', max_score: 3.0 }, { title: 'Geographic & thematic balance', max_score: 2.0 },
    { title: 'Role clarity & resource adequacy', max_score: 2.0 }, { title: 'Prior collaboration evidence', max_score: 1.0 }, { title: 'Associated partners value', max_score: 1.0 },
  ]},
  '25c33c4b-cd33-4626-a7fd-d206ca7bfc3c': { code: '2.2.2', criteria: [
    { title: 'Decision-making mechanisms', max_score: 2.0 }, { title: 'Conflict resolution procedures', max_score: 2.0 },
    { title: 'Partner engagement & ownership', max_score: 2.0 }, { title: 'Communication & coordination tools', max_score: 1.0 }, { title: 'Adaptability to challenges', max_score: 1.0 },
  ]},
  '8974cc11-01ba-422a-af43-06fe1838babf': { code: '3.1', criteria: [
    { title: 'Short-term impact on target groups', max_score: 2.0 }, { title: 'Medium-term systemic impact', max_score: 2.0 },
    { title: 'European-level impact ambition', max_score: 2.0 }, { title: 'Impact measurement methodology', max_score: 1.0 }, { title: 'Policy influence potential', max_score: 1.0 },
  ]},
  '513fa289-7d2b-4a4e-8f7a-b65739499000': { code: '3.2', criteria: [
    { title: 'Communication strategy & channels', max_score: 2.0 }, { title: 'Dissemination plan & reach', max_score: 2.0 },
    { title: 'Multiplier events design', max_score: 2.0 }, { title: 'EU visibility compliance', max_score: 1.0 }, { title: 'OER & open access commitment', max_score: 1.0 },
  ]},
  '67daae22-ef28-41b5-bab1-25e3eb53aed3': { code: '3.3', criteria: [
    { title: 'Financial sustainability plan', max_score: 2.0 }, { title: 'Institutional embedding', max_score: 2.0 },
    { title: 'Policy uptake & mainstreaming', max_score: 2.0 }, { title: 'Results continuation mechanisms', max_score: 1.0 }, { title: 'Scalability & transferability', max_score: 1.0 },
  ]},
};

// Generate full criteria for shorter entries
function expandCriterion(c, code, evalCrit) {
  return {
    title: c.title,
    meaning: c.meaning || `Maps to ${evalCrit}. Evaluates ${c.title.toLowerCase()} quality and specificity. Strong: concrete evidence with three dimensions. Weak: generic or missing. Differentiator: project-specific detail with cross-references.`,
    structure: c.structure || 'Narrative: context and rationale. Bullets: 3 specific elements with evidence. Narrative: synthesis and cross-references to other sections.',
    relations: c.relations || `Cross-reference with related sections. Evaluators check consistency across the full proposal. ${evalCrit} scoring depends on coherence.`,
    rules: c.rules || 'Follow Programme Guide requirements. Be specific and evidence-based.',
    red_flags: c.red_flags || 'Generic claims without evidence. Inconsistency with other sections. AI-generated feel with buzzwords. Missing specific project data.',
    score_rubric: c.score_rubric || '{"0":"Not addressed","25":"Minimal, generic","50":"Partial, some evidence","75":"Solid, well-evidenced","100":"Comprehensive, specific, cross-referenced"}',
    max_score: c.max_score,
    mandatory: c.mandatory || 0,
  };
}

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root', password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eplus_tools',
  });

  // Clear existing criteria for KA3 questions
  const ka3Sections = await conn.execute(
    "SELECT id FROM eval_sections WHERE program_id = '00000000-0000-4000-a000-000000000001'"
  );
  for (const sec of ka3Sections[0]) {
    const qs = await conn.execute('SELECT id FROM eval_questions WHERE section_id = ?', [sec.id]);
    for (const q of qs[0]) {
      await conn.execute('DELETE FROM eval_criteria WHERE question_id = ?', [q.id]);
    }
  }

  let total = 0;

  // Insert detailed criteria (Q)
  for (const [qId, data] of Object.entries(Q)) {
    for (let i = 0; i < data.criteria.length; i++) {
      const c = data.criteria[i];
      const id = require('crypto').randomUUID();
      await conn.execute(
        `INSERT INTO eval_criteria (id, question_id, title, max_score, mandatory, meaning, structure, relations, rules, red_flags, score_rubric, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, qId, c.title, c.max_score, c.mandatory || 0, c.meaning, c.structure, c.relations, c.rules, c.red_flags, c.score_rubric, i]
      );
      total++;
    }
    console.log(`  ✓ ${data.code} ${data.title} — ${data.criteria.length} criteria`);
  }

  // Insert expanded criteria (Q2)
  const evalMap = {
    '2.1.3': 'Eval Criterion 2 (Quality, 30pts)', '2.1.4': 'Eval Criterion 2', '2.1.5': 'Eval Criterion 2',
    '2.2.1': 'Eval Criterion 3 (Partnership, 20pts)', '2.2.2': 'Eval Criterion 3',
    '3.1': 'Eval Criterion 4 (Impact, 20pts)', '3.2': 'Eval Criterion 4', '3.3': 'Eval Criterion 4',
  };
  for (const [qId, data] of Object.entries(Q2)) {
    for (let i = 0; i < data.criteria.length; i++) {
      const c = expandCriterion(data.criteria[i], data.code, evalMap[data.code] || 'Eval Criterion');
      const id = require('crypto').randomUUID();
      await conn.execute(
        `INSERT INTO eval_criteria (id, question_id, title, max_score, mandatory, meaning, structure, relations, rules, red_flags, score_rubric, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, qId, c.title, c.max_score, c.mandatory, c.meaning, c.structure, c.relations, c.rules, c.red_flags, c.score_rubric, i]
      );
      total++;
    }
    console.log(`  ✓ ${data.code} — ${data.criteria.length} criteria`);
  }

  // Update question max_scores to match criteria sums
  const allQs = [...Object.keys(Q), ...Object.keys(Q2)];
  for (const qId of allQs) {
    const [sum] = await conn.execute('SELECT SUM(max_score) as total FROM eval_criteria WHERE question_id = ?', [qId]);
    await conn.execute('UPDATE eval_questions SET max_score = ? WHERE id = ?', [sum[0].total || 0, qId]);
  }

  console.log(`\n✓ ${total} criteria inserted across ${allQs.length} questions.`);
  await conn.end();
}

run().catch(e => { console.error(e); process.exit(1); });
