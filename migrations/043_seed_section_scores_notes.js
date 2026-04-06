// 043: Seed max_score and eval_notes for KA3 Youth Together sections
// This is a JS migration — the migrate runner will detect .js and execute it

const mysql = require('mysql2/promise');

module.exports = async function(pool) {
  const sections = [
    {
      titlePattern: '%Relevance%',
      max_score: 30,
      eval_notes: `RELEVANCE OF THE PROJECT (maximum score 30 points)

\u2022 Purpose and EU added value: the proposal establishes and develops an EU added-value project that supports policies at EU level relevant for youth \u2013 most notably the EU Youth Strategy 2019-2027, e.g. supporting the creation/implementation of policies, policy discussion, and collaboration with youth stakeholders in line with the EU Youth Strategy 2019-2027, the legacy of the European Year of Youth 2022 and the European Youth Work Agenda.

\u2022 EU Values: The proposal is relevant for the respect and promotion of shared EU values, such as respect for human dignity, freedom, democracy, equality, the rule of law and respect for human rights, as well as fighting any sort of discrimination.

\u2022 Objectives: the proposal objectives are relevant to at least one of the general objectives of the action and at least one of its specific objectives; moreover, the proposal objectives are specific and clearly defined, achievable, measurable, realistic and timely; they address issues relevant to the participating organisations and of a clear added value to the chosen target groups.

\u2022 Needs: the proposal demonstrates that it is based on a thorough needs assessment based as far as possible on verifiable facts and figures supported by general and specific data relevant to all countries and organisations in the consortium. A clear needs analysis linking to the concrete realities of applicants, partners and target groups is expected.

\u2022 Youth engagement: the proposal demonstrates an active engagement of the partnership with a diverse youth population including those from remote/rural areas and/or with fewer opportunities.`
    },
    {
      titlePattern: '%Quality%design%',
      max_score: 30,
      eval_notes: `QUALITY OF THE PROJECT DESIGN AND IMPLEMENTATION (maximum score 30 points)

\u2022 Planning: The proposal is clear, complete and of high quality and includes appropriate phases for preparation, implementation, monitoring, and evaluation of the project based on robust project management methodologies.

\u2022 Methodology: The implementation is based on suitable methodologies; the objectives are consistent with the activities and are clearly outlined, with logical links between the identified problems, needs and solutions; the work plan is coherent and concrete; there are suitable quality control measures and indicators to ensure that the project will be duly implemented with the required quality, in scope, in time and within budget; there are concrete and suitable risk management and contingency plans.

\u2022 Cost effectiveness: the proposed budget is coherent, detailed enough, suited for the implementation of the project and designed to ensure the best value for money. The resources assigned to work packages are in line with their objectives and deliverables. The budget caters to the needs of grassroots organisations and vulnerable young people in order to encourage their inclusion in the Erasmus+ programme.

\u2022 Learning dimension: The project includes a strong learning component, with clearly defined learning outcomes for young participants. It ensures a reflection process to identify and document these learning outcomes, encouraging the use of the European transparency and recognition tools, in particular Youthpass, in line with the principles of non-formal learning and the Capacity Building on Youth approach.`
    },
    {
      titlePattern: '%partnership%',
      max_score: 20,
      eval_notes: `QUALITY OF THE PARTNERSHIP AND THE COOPERATION ARRANGEMENTS (maximum score 20 points)

\u2022 Partnership profile: the partnership involves an appropriate mix of complementary organisations with the necessary profiles, skills, experience, expertise and management support to achieve its objectives; the added value of the for-profit organisations is clearly demonstrated, if involved in the consortium.

\u2022 Geographic spread: the partnership demonstrates capacity to reflect the European economic, social and/or cultural diversity through its geographic spread so as to ensure a truly pan European cooperation.

\u2022 Local NGOs development: the partnership has the ability to develop the capacities and knowledge of local NGOs that are not already well established at European level to achieve enhanced peer-to-peer collaboration between NGOs across Europe.

\u2022 Commitment & tasks: the distribution of responsibilities and tasks in the partnership is clear and appropriate; the coordinator shows high quality management and potential for coordination of transnational networks and leadership in complex environments; young people are suitably involved in all stages of the project implementation.

\u2022 Cooperation arrangements: the governance mechanisms proposed will ensure an effective coordination, decision-making, communication and conflict resolution between the participating organisations, participants and any other relevant stakeholders.`
    },
    {
      titlePattern: '%Impact%',
      max_score: 20,
      eval_notes: `IMPACT (maximum score 20 points)

\u2022 Impact & Sustainability: The proposal identifies pathways for contributing to at least one of the expected impact areas of the action. The steps towards the achievement of the expected impact(s) of the project are clearly identified, logical and credible. Moreover, the project outcomes will have positive and tangible impact on participants and partner organisations. In particular, the project is likely to contribute towards expanding the grassroots organisations' focus of national, regional or local activities not yet cross border in nature, where activities were scaled up or developed at EU level during and after the project lifetime, as well as on the youth community at large. The proposal identifies how the outcomes of the project could potentially contribute to changes at system level in the youth sector both within the project lifetime and beyond, to enable long lasting cooperation at EU level and/or inspire new EU youth policies and initiatives.

\u2022 Communication & Dissemination: the proposal demonstrates capacity to undertake youth outreach and ability to communicate effectively on problems and solutions of the communities they represent to a broader global audience; in particular, the proposal provides a sound plan for the communication and dissemination of results and includes appropriate targets, activities and tasks distribution among partners, relevant timing, tools and channels to ensure that the results and benefits will be spread effectively to policy makers and are accessible to end users within and after the project's lifetime. All measures are proportionate to the scale of the project, and contain concrete actions to be implemented both during and after the end of the project.`
    }
  ];

  for (const sec of sections) {
    const [rows] = await pool.query(
      'UPDATE eval_sections SET max_score = ?, eval_notes = ? WHERE title LIKE ? AND (eval_notes IS NULL OR eval_notes = "")',
      [sec.max_score, sec.eval_notes, sec.titlePattern]
    );
  }
};
