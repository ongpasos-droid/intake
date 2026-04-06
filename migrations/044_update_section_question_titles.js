// 044: Update section & question titles to match the real Application Form (Part B)
// Also adds Section 5 (Work Plan) with 0 pts — no evaluation weight but same quality structure
// Idempotent: uses UPDATE with title matching, creates Section 5 only if missing

const { v4: uuid } = require('uuid');

const SECTION_UPDATES = [
  {
    oldTitleMatch: '1. Relevance',
    newTitle: '1. Relevance',
    questions: [
      { oldCode: '1.1', newTitle: 'Background and general objectives' },
      { oldCode: '1.2', newTitle: 'Needs analysis and specific objectives' },
      { oldCode: '1.3', newTitle: 'Complementarity, innovation and EU added value' },
    ]
  },
  {
    oldTitleMatch: '2. Quality',
    newTitle: '2. Quality of project design and implementation',
    questions: [
      { oldCode: '2.1', newTitle: 'Concept and methodology' },
      { oldCode: '2.2', newTitle: 'Project management, quality assurance and monitoring' },
      { oldCode: '2.3', newTitle: 'Budget and cost-effectiveness' },
    ]
  },
  {
    oldTitleMatch: '3. Quality of the partnership',
    newTitle: '3. Quality of the partnership and cooperation',
    questions: [
      { oldCode: '3.1', newTitle: 'Consortium composition and division of roles' },
      { oldCode: '3.2', newTitle: 'Consortium management and decision-making' },
    ]
  },
  {
    oldTitleMatch: '4. Impact',
    newTitle: '4. Impact, dissemination and sustainability',
    questions: [
      { oldCode: '4.1', newTitle: 'Impact and ambition' },
      { oldCode: '4.2', newTitle: 'Communication, dissemination and visibility' },
      { oldCode: '4.3', newTitle: 'Sustainability, long-term impact and continuation' },
    ]
  }
];

const SECTION_5 = {
  title: '5. Work plan, work packages and resources',
  color: '#6b7280',
  maxScore: 0,
  evalNotes: `WORK PLAN, WORK PACKAGES, ACTIVITIES, RESOURCES AND TIMING (no direct evaluation score)

This section does not carry its own evaluation score but is critically cross-referenced by evaluators when scoring Sections 2, 3 and 4. A weak or inconsistent work plan will lower scores across multiple award criteria.

The work plan must demonstrate:

• Logical structure: Work packages grouped logically with clear deliverables. WP1 should cover management and coordination. The last WP should be dedicated to impact and dissemination.

• Consistency with narrative: Every activity described in Section 2 (methodology, quality assurance) must appear in a specific work package with assigned tasks, responsibilities and timing.

• Partnership coherence: The division of tasks across partners must match the roles and competences described in Section 3. Each partner should have a meaningful, justified role.

• Resource alignment: Budget allocations per work package must be proportional to the activities described. Cost-effectiveness claims in Section 2.1.4 must be verifiable against the work plan.

• Realistic timeline: Milestones and deliverables must have realistic due dates. Month 1 marks the start of the project. The timeline should show preparation, implementation and follow-up/sustainability phases.

• Deliverables quality: Limit to 10-15 major deliverables for the entire project. Each deliverable needs: format, language(s), estimated pages/copies, due month. Events need: agenda, target group, estimated participants, duration.

• Minimum 2 work packages required. Each WP needs: objectives, activities with task distribution, milestones, deliverables with due dates and dissemination level (Public/Sensitive/EU Classified).`,
  questions: [
    { code: '5.1', title: 'Work plan overview and structure', maxScore: 0 },
    { code: '5.2', title: 'Work packages, activities and deliverables', maxScore: 0 },
    { code: '5.3', title: 'Project teams, staff and resources', maxScore: 0 },
    { code: '5.4', title: 'Risk management and contingency', maxScore: 0 },
  ]
};

module.exports = async function(pool) {
  // Find KA3 programme(s)
  const [programs] = await pool.query(
    "SELECT id FROM intake_programs WHERE action_type LIKE 'KA3%' OR name LIKE '%KA3%' OR name LIKE '%Youth Together%'"
  );
  if (!programs.length) return;

  for (const prog of programs) {
    // --- Update existing section & question titles ---
    for (const sec of SECTION_UPDATES) {
      // Update section title
      await pool.query(
        'UPDATE eval_sections SET title = ? WHERE program_id = ? AND title LIKE ?',
        [sec.newTitle, prog.id, sec.oldTitleMatch + '%']
      );

      // Get section id for question updates
      const [sections] = await pool.query(
        'SELECT id FROM eval_sections WHERE program_id = ? AND title = ?',
        [prog.id, sec.newTitle]
      );
      if (!sections.length) continue;

      const sectionId = sections[0].id;

      for (const q of sec.questions) {
        await pool.query(
          'UPDATE eval_questions SET title = ? WHERE section_id = ? AND code = ?',
          [q.newTitle, sectionId, q.oldCode]
        );
      }
    }

    // --- Create Section 5 if it doesn't exist ---
    const [existing5] = await pool.query(
      "SELECT id FROM eval_sections WHERE program_id = ? AND title LIKE '5.%'",
      [prog.id]
    );

    if (!existing5.length) {
      const secId = uuid();
      await pool.query(
        'INSERT INTO eval_sections (id, program_id, title, color, max_score, eval_notes, sort_order) VALUES (?,?,?,?,?,?,?)',
        [secId, prog.id, SECTION_5.title, SECTION_5.color, SECTION_5.maxScore, SECTION_5.evalNotes, 4]
      );
      for (let qi = 0; qi < SECTION_5.questions.length; qi++) {
        const q = SECTION_5.questions[qi];
        await pool.query(
          'INSERT INTO eval_questions (id, section_id, code, title, max_score, sort_order) VALUES (?,?,?,?,?,?)',
          [uuid(), secId, q.code, q.title, q.maxScore, qi]
        );
      }
    }
  }
};
