// 043: Seed max_score, eval_notes AND create sections+questions for KA3 if missing
// Idempotent: only acts if sections don't exist for KA3 programme

const { v4: uuid } = require('uuid');

const SECTIONS = [
  {
    title: '1. Relevance of the project', color: '#1e3a5f', maxScore: 30,
    evalNotes: `RELEVANCE OF THE PROJECT (maximum score 30 points)

\u2022 Purpose and EU added value: the proposal establishes and develops an EU added-value project that supports policies at EU level relevant for youth \u2013 most notably the EU Youth Strategy 2019-2027, e.g. supporting the creation/implementation of policies, policy discussion, and collaboration with youth stakeholders in line with the EU Youth Strategy 2019-2027, the legacy of the European Year of Youth 2022 and the European Youth Work Agenda.

\u2022 EU Values: The proposal is relevant for the respect and promotion of shared EU values, such as respect for human dignity, freedom, democracy, equality, the rule of law and respect for human rights, as well as fighting any sort of discrimination.

\u2022 Objectives: the proposal objectives are relevant to at least one of the general objectives of the action and at least one of its specific objectives; moreover, the proposal objectives are specific and clearly defined, achievable, measurable, realistic and timely; they address issues relevant to the participating organisations and of a clear added value to the chosen target groups.

\u2022 Needs: the proposal demonstrates that it is based on a thorough needs assessment based as far as possible on verifiable facts and figures supported by general and specific data relevant to all countries and organisations in the consortium. A clear needs analysis linking to the concrete realities of applicants, partners and target groups is expected.

\u2022 Youth engagement: the proposal demonstrates an active engagement of the partnership with a diverse youth population including those from remote/rural areas and/or with fewer opportunities.`,
    questions: [
      { code: '1.1', title: 'Background, context and rationale', maxScore: 12 },
      { code: '1.2', title: 'Objectives and EU added value', maxScore: 9 },
      { code: '1.3', title: 'Target groups and participants', maxScore: 9 },
    ]
  },
  {
    title: '2. Quality of project design and implementation', color: '#2563eb', maxScore: 30,
    evalNotes: `QUALITY OF THE PROJECT DESIGN AND IMPLEMENTATION (maximum score 30 points)

\u2022 Planning: The proposal is clear, complete and of high quality and includes appropriate phases for preparation, implementation, monitoring, and evaluation of the project based on robust project management methodologies.

\u2022 Methodology: The implementation is based on suitable methodologies; the objectives are consistent with the activities and are clearly outlined, with logical links between the identified problems, needs and solutions; the work plan is coherent and concrete; there are suitable quality control measures and indicators to ensure that the project will be duly implemented with the required quality, in scope, in time and within budget; there are concrete and suitable risk management and contingency plans.

\u2022 Cost effectiveness: the proposed budget is coherent, detailed enough, suited for the implementation of the project and designed to ensure the best value for money. The resources assigned to work packages are in line with their objectives and deliverables. The budget caters to the needs of grassroots organisations and vulnerable young people in order to encourage their inclusion in the Erasmus+ programme.

\u2022 Learning dimension: The project includes a strong learning component, with clearly defined learning outcomes for young participants. It ensures a reflection process to identify and document these learning outcomes, encouraging the use of the European transparency and recognition tools, in particular Youthpass, in line with the principles of non-formal learning and the Capacity Building on Youth approach.`,
    questions: [
      { code: '2.1', title: 'Methodology and approach', maxScore: 10 },
      { code: '2.2', title: 'Work plan and activities', maxScore: 10 },
      { code: '2.3', title: 'Quality and risk management', maxScore: 10 },
    ]
  },
  {
    title: '3. Quality of the partnership and cooperation', color: '#3b82f6', maxScore: 20,
    evalNotes: `QUALITY OF THE PARTNERSHIP AND THE COOPERATION ARRANGEMENTS (maximum score 20 points)

\u2022 Partnership profile: the partnership involves an appropriate mix of complementary organisations with the necessary profiles, skills, experience, expertise and management support to achieve its objectives; the added value of the for-profit organisations is clearly demonstrated, if involved in the consortium.

\u2022 Geographic spread: the partnership demonstrates capacity to reflect the European economic, social and/or cultural diversity through its geographic spread so as to ensure a truly pan European cooperation.

\u2022 Local NGOs development: the partnership has the ability to develop the capacities and knowledge of local NGOs that are not already well established at European level to achieve enhanced peer-to-peer collaboration between NGOs across Europe.

\u2022 Commitment & tasks: the distribution of responsibilities and tasks in the partnership is clear and appropriate; the coordinator shows high quality management and potential for coordination of transnational networks and leadership in complex environments; young people are suitably involved in all stages of the project implementation.

\u2022 Cooperation arrangements: the governance mechanisms proposed will ensure an effective coordination, decision-making, communication and conflict resolution between the participating organisations, participants and any other relevant stakeholders.`,
    questions: [
      { code: '3.1', title: 'Consortium composition and competence', maxScore: 10 },
      { code: '3.2', title: 'Cooperation and communication', maxScore: 10 },
    ]
  },
  {
    title: '4. Impact, dissemination and sustainability', color: '#60a5fa', maxScore: 20,
    evalNotes: `IMPACT (maximum score 20 points)

\u2022 Impact & Sustainability: The proposal identifies pathways for contributing to at least one of the expected impact areas of the action. The steps towards the achievement of the expected impact(s) of the project are clearly identified, logical and credible. Moreover, the project outcomes will have positive and tangible impact on participants and partner organisations. In particular, the project is likely to contribute towards expanding the grassroots organisations' focus of national, regional or local activities not yet cross border in nature, where activities were scaled up or developed at EU level during and after the project lifetime, as well as on the youth community at large. The proposal identifies how the outcomes of the project could potentially contribute to changes at system level in the youth sector both within the project lifetime and beyond, to enable long lasting cooperation at EU level and/or inspire new EU youth policies and initiatives.

\u2022 Communication & Dissemination: the proposal demonstrates capacity to undertake youth outreach and ability to communicate effectively on problems and solutions of the communities they represent to a broader global audience; in particular, the proposal provides a sound plan for the communication and dissemination of results and includes appropriate targets, activities and tasks distribution among partners, relevant timing, tools and channels to ensure that the results and benefits will be spread effectively to policy makers and are accessible to end users within and after the project's lifetime. All measures are proportionate to the scale of the project, and contain concrete actions to be implemented both during and after the end of the project.`,
    questions: [
      { code: '4.1', title: 'Expected impact and sustainability', maxScore: 8 },
      { code: '4.2', title: 'Dissemination and exploitation of results', maxScore: 7 },
      { code: '4.3', title: 'Wider impact and policy contribution', maxScore: 5 },
    ]
  }
];

module.exports = async function(pool) {
  // Find KA3 programme(s)
  const [programs] = await pool.query("SELECT id FROM intake_programs WHERE action_type LIKE 'KA3%' OR name LIKE '%KA3%' OR name LIKE '%Youth Together%'");
  if (!programs.length) return;

  for (const prog of programs) {
    // Check if sections already exist
    const [existing] = await pool.query('SELECT id FROM eval_sections WHERE program_id = ?', [prog.id]);

    if (existing.length > 0) {
      // Sections exist — just update max_score and eval_notes where missing
      for (const sec of SECTIONS) {
        await pool.query(
          'UPDATE eval_sections SET max_score = ?, eval_notes = COALESCE(NULLIF(eval_notes, ""), ?) WHERE program_id = ? AND title LIKE ?',
          [sec.maxScore, sec.evalNotes, prog.id, '%' + sec.title.substring(3, 20) + '%']
        );
      }
    } else {
      // No sections — create full structure
      for (let si = 0; si < SECTIONS.length; si++) {
        const sec = SECTIONS[si];
        const secId = uuid();
        await pool.query(
          'INSERT INTO eval_sections (id, program_id, title, color, max_score, eval_notes, sort_order) VALUES (?,?,?,?,?,?,?)',
          [secId, prog.id, sec.title, sec.color, sec.maxScore, sec.evalNotes, si]
        );
        for (let qi = 0; qi < sec.questions.length; qi++) {
          const q = sec.questions[qi];
          await pool.query(
            'INSERT INTO eval_questions (id, section_id, code, title, max_score, sort_order) VALUES (?,?,?,?,?,?)',
            [uuid(), secId, q.code, q.title, q.maxScore, qi]
          );
        }
      }
    }
  }
};
