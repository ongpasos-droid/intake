require('dotenv').config();
const mysql = require('mysql2/promise');
const { v4: uuid } = require('uuid');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eplus_tools'
  });

  const programId = '00000000-0000-4000-a000-000000000001';
  await conn.query('DELETE FROM eval_sections WHERE program_id=?', [programId]);

  const COLORS = ['#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa'];
  const sections = [
    { title: '1. Relevance of the project', questions: [
      { code: '1.1', title: 'Background, context and rationale',
        prompt: 'To what extent is the proposal based on a sound and well-documented needs analysis? How clearly does it identify the problems and challenges to be addressed?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Evidence-based problem statement', maxScore: 2, mandatory: 1, meaning: 'The proposal presents a clear, data-driven problem statement grounded in verifiable sources.', structure: 'Opening paragraph with EU-level data (Eurostat, FRA, WHO), followed by national-level evidence from each partner country.', relations: 'Links directly to EU Youth Strategy 2019-2027 goals and Erasmus+ programme priorities.', rules: 'Must cite at least 3 independent data sources published within the last 3 years.' },
          { title: 'Geographical and thematic scope', maxScore: 2, mandatory: 1, meaning: 'The scope covers multiple EU countries and demonstrates a transnational dimension.', structure: 'Country-by-country analysis showing how the problem manifests differently in each context.', relations: 'Each partner country context feeds into the overall rationale for transnational cooperation.', rules: 'Minimum 4 EU/associated countries represented with specific local evidence.' },
          { title: 'Gap analysis', maxScore: 2, mandatory: 1, meaning: 'The proposal identifies what is missing in existing policies, programmes or practices.', structure: 'Comparison of existing initiatives vs unmet needs, highlighting the gap this project fills.', relations: 'The gap must logically lead to the proposed solution and methodology.', rules: 'Must demonstrate awareness of at least 2 existing EU or national initiatives in the field.' },
          { title: 'Policy alignment', maxScore: 2, mandatory: 1, meaning: 'Clear alignment with EU policy frameworks and Erasmus+ programme guide priorities.', structure: 'Explicit mapping between project goals and EU policy objectives (Youth Strategy, European Pillar of Social Rights, etc.).', relations: 'Each project objective should map to at least one EU policy priority.', rules: 'Reference specific policy documents with dates and article/section numbers where applicable.' },
          { title: 'Urgency and timeliness', maxScore: 2, mandatory: 0, meaning: 'The proposal explains why the project is needed now and cannot wait.', structure: 'Current trends, emerging challenges, or policy windows that make the timing critical.', relations: 'Connects to current EU political agenda and upcoming policy developments.', rules: 'Should reference at least one recent event or policy development (within 12 months).' }
        ]
      },
      { code: '1.2', title: 'Objectives and EU added value',
        prompt: 'To what extent are the objectives clearly defined, realistic and addressing the identified needs? What is the European added value of the project?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'SMART general objectives', maxScore: 2, mandatory: 1, meaning: 'General objectives are Specific, Measurable, Achievable, Relevant and Time-bound.', structure: 'List of 2-3 general objectives, each with success indicators and verification methods.', relations: 'Each general objective addresses at least one problem identified in 1.1.', rules: 'Avoid vague language like "improve" without specifying how improvement will be measured.' },
          { title: 'Specific objectives and outputs', maxScore: 2, mandatory: 1, meaning: 'Specific objectives are concrete and directly achievable through project activities.', structure: 'List of 4-6 specific objectives linked to concrete deliverables and work packages.', relations: 'Each specific objective contributes to at least one general objective.', rules: 'Each specific objective must have at least one quantifiable output indicator.' },
          { title: 'EU added value', maxScore: 2, mandatory: 1, meaning: 'The project demonstrates clear value from transnational cooperation that could not be achieved nationally.', structure: 'Explanation of why this project requires European-level cooperation.', relations: 'Links to the rationale for consortium composition and partner selection.', rules: 'Must articulate at least 3 concrete benefits of transnational vs national approach.' },
          { title: 'Coherence with programme priorities', maxScore: 2, mandatory: 1, meaning: 'The objectives directly address Erasmus+ KA3 programme priorities.', structure: 'Mapping table showing objectives vs KA3 priorities (youth participation, inclusion, digital, sustainability).', relations: 'At least 2 horizontal priorities of the Erasmus+ programme are explicitly addressed.', rules: 'Use the exact priority wording from the Programme Guide for accurate mapping.' },
          { title: 'Innovation dimension', maxScore: 2, mandatory: 0, meaning: 'The project brings genuinely new approaches, methods or solutions.', structure: 'Clear description of what is innovative compared to existing practice.', relations: 'Innovation should be justified by the gap analysis in 1.1.', rules: 'Innovation can be in content, methodology, technology, partnership model or target group approach.' }
        ]
      },
      { code: '1.3', title: 'Target groups and participants',
        prompt: 'To what extent are target groups and participants clearly identified and appropriate? How will the project reach them?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Target group definition', maxScore: 2, mandatory: 1, meaning: 'Target groups are precisely defined with demographic and socio-economic characteristics.', structure: 'Profile of each target group: age range, geography, socio-economic status, specific vulnerabilities.', relations: 'Target groups must match the needs identified in section 1.1.', rules: 'Distinguish between direct participants, indirect beneficiaries and final beneficiaries.' },
          { title: 'Inclusion of fewer opportunities', maxScore: 2, mandatory: 1, meaning: 'The project specifically includes young people with fewer opportunities.', structure: 'Definition of which barriers are addressed (economic, social, geographical, disability, etc.).', relations: 'Inclusion strategy must be integrated across all activities, not just as an add-on.', rules: 'Must specify concrete numbers/percentages of participants with fewer opportunities.' },
          { title: 'Outreach and recruitment strategy', maxScore: 2, mandatory: 1, meaning: 'Clear and realistic plan for reaching and engaging target groups.', structure: 'Step-by-step recruitment plan with channels, partners and timeline.', relations: 'Outreach channels must be appropriate for each specific target group.', rules: 'Must include both online and offline recruitment strategies.' },
          { title: 'Participant engagement plan', maxScore: 2, mandatory: 1, meaning: 'Strategy for keeping participants engaged throughout the project.', structure: 'Engagement plan with milestones, feedback mechanisms and retention strategies.', relations: 'Engagement plan links to learning outcomes and impact measurement.', rules: 'Must address potential dropout and mitigation measures.' },
          { title: 'Quantitative targets', maxScore: 2, mandatory: 0, meaning: 'Realistic and ambitious participant numbers are provided.', structure: 'Table with participant numbers per activity, country, and target group category.', relations: 'Numbers must be proportionate to the budget and duration.', rules: 'Include both minimum and target participation numbers.' }
        ]
      }
    ]},
    { title: '2. Quality of project design and implementation', questions: [
      { code: '2.1', title: 'Work programme and activities',
        prompt: 'To what extent is the work programme clear, complete and coherent? Are the activities well-designed to achieve the objectives?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Logical framework coherence', maxScore: 2, mandatory: 1, meaning: 'Activities logically follow from objectives and lead to expected results.', structure: 'Intervention logic: needs → objectives → activities → outputs → outcomes → impact.', relations: 'Every activity must trace back to at least one specific objective.', rules: 'Use a logframe matrix or theory of change diagram to demonstrate coherence.' },
          { title: 'Work package structure', maxScore: 2, mandatory: 1, meaning: 'Work is organised in clearly defined work packages with deliverables and milestones.', structure: 'WP description with objectives, activities, deliverables, lead partner and timeline.', relations: 'WPs must cover all project phases: preparation, implementation, follow-up.', rules: 'Include a management/coordination WP and a dissemination WP.' },
          { title: 'Timeline and milestones', maxScore: 2, mandatory: 1, meaning: 'The project timeline is realistic with clear milestones.', structure: 'Gantt chart showing all activities, dependencies and critical milestones.', relations: 'Milestones mark completion of key deliverables or phase transitions.', rules: 'Include buffer time for delays; avoid front-loading or back-loading activities.' },
          { title: 'Methodology and pedagogical approach', maxScore: 2, mandatory: 1, meaning: 'The methodology is well-defined, appropriate and evidence-based.', structure: 'Description of methods used (non-formal education, peer learning, etc.) with justification.', relations: 'Methodology must be appropriate for the target group and learning objectives.', rules: 'Reference established methodological frameworks (e.g. Kolb, Council of Europe competence model).' },
          { title: 'Quality of learning activities', maxScore: 2, mandatory: 0, meaning: 'Learning activities are well-designed with clear learning outcomes.', structure: 'Description of each learning activity with objectives, methods, duration and expected outcomes.', relations: 'Learning outcomes contribute to achieving specific objectives.', rules: 'Activities should combine different learning styles (experiential, collaborative, reflective).' }
        ]
      },
      { code: '2.2', title: 'Project management and quality assurance',
        prompt: 'To what extent are the project management arrangements adequate? Is there a clear quality assurance plan?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Management structure', maxScore: 2, mandatory: 1, meaning: 'Clear governance and decision-making structure with defined roles.', structure: 'Organigram showing steering committee, project coordinator, WP leaders and reporting lines.', relations: 'Management structure must ensure all partners are represented in decision-making.', rules: 'Define frequency of coordination meetings (at least quarterly) and decision-making procedures.' },
          { title: 'Risk management plan', maxScore: 2, mandatory: 1, meaning: 'Key risks are identified with mitigation strategies.', structure: 'Risk register with probability, impact, owner and mitigation for at least 5 risks.', relations: 'Risks should cover all dimensions: financial, operational, partnership, external.', rules: 'Include contingency plans for the top 3 risks.' },
          { title: 'Quality assurance framework', maxScore: 2, mandatory: 1, meaning: 'Systematic approach to ensuring quality of activities and outputs.', structure: 'QA plan with quality indicators, monitoring methods and responsible persons.', relations: 'QA indicators must map to project objectives and expected results.', rules: 'Include both internal quality review and external evaluation mechanisms.' },
          { title: 'Communication and reporting', maxScore: 2, mandatory: 1, meaning: 'Internal communication plan and reporting mechanisms are defined.', structure: 'Communication matrix: who reports what, to whom, how often, through which channels.', relations: 'Reporting feeds into quality assurance and risk management processes.', rules: 'Use a shared project management platform (e.g. Trello, Asana, Teams).' },
          { title: 'Financial management', maxScore: 2, mandatory: 0, meaning: 'Sound financial management and control procedures.', structure: 'Description of financial procedures: budget monitoring, expense approval, audit trail.', relations: 'Financial management ensures compliance with Erasmus+ financial rules.', rules: 'Define clear procedures for budget transfers between cost categories and partners.' }
        ]
      },
      { code: '2.3', title: 'Budget and cost-effectiveness',
        prompt: 'To what extent is the budget coherent with the activities? Is the cost-benefit ratio appropriate?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Budget-activity coherence', maxScore: 2, mandatory: 1, meaning: 'Budget allocation is proportionate to the scope and importance of each activity.', structure: 'Budget breakdown by WP and cost category with justification for major items.', relations: 'Each budget line must be traceable to specific activities in the work programme.', rules: 'No single WP should consume more than 40% of the total budget (except coordination if justified).' },
          { title: 'Eligible costs compliance', maxScore: 2, mandatory: 1, meaning: 'All costs comply with Erasmus+ eligibility rules.', structure: 'Verification that each cost category follows the Programme Guide rules.', relations: 'Staff costs, travel, equipment, subcontracting within allowed limits.', rules: 'Subcontracting must not exceed 30% of the total grant; equipment must not exceed 20%.' },
          { title: 'Co-financing plan', maxScore: 2, mandatory: 1, meaning: 'The co-financing share is clearly identified and realistic.', structure: 'Sources of co-financing with confirmation letters or commitment statements.', relations: 'Co-financing demonstrates institutional commitment from partner organisations.', rules: 'Co-financing must cover at least 20% of total eligible costs for KA3.' },
          { title: 'Cost-effectiveness', maxScore: 2, mandatory: 1, meaning: 'The project delivers good value for money relative to expected impact.', structure: 'Cost per participant, cost per output, comparison with similar projects.', relations: 'Efficiency gains from transnational cooperation should be demonstrated.', rules: 'Justify any cost that exceeds standard Erasmus+ unit cost benchmarks.' },
          { title: 'Resource allocation across partnership', maxScore: 2, mandatory: 0, meaning: 'Budget distribution among partners reflects their roles and contributions.', structure: 'Budget per partner with justification based on their responsibilities.', relations: 'Partners with more activities/deliverables should have proportionally larger budgets.', rules: 'No partner should receive less than 5% or more than 50% of the total budget.' }
        ]
      }
    ]},
    { title: '3. Quality of the partnership and cooperation', questions: [
      { code: '3.1', title: 'Consortium composition and complementarity',
        prompt: 'To what extent is the partnership well-balanced and complementary? Do partners bring the right expertise?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Partner expertise and track record', maxScore: 2, mandatory: 1, meaning: 'Each partner demonstrates relevant expertise and experience in the project field.', structure: 'Profile of each partner: mission, expertise, previous EU projects, key staff.', relations: 'Partner expertise must cover all thematic areas of the project.', rules: 'At least 2 partners must have previous experience managing EU-funded projects.' },
          { title: 'Geographical balance', maxScore: 2, mandatory: 1, meaning: 'The consortium covers a meaningful geographical spread across Europe.', structure: 'Map of partner locations with justification for geographical selection.', relations: 'Geographical diversity enables comparative learning and wider impact.', rules: 'KA3 Youth Together requires minimum 5 partners from 5 different eligible countries.' },
          { title: 'Sectoral diversity', maxScore: 2, mandatory: 1, meaning: 'Partners represent different sectors (NGO, public, academic, youth organisations).', structure: 'Table showing each partner type, sector, and the specific added value they bring.', relations: 'Sectoral diversity enriches methodology and ensures multi-stakeholder approach.', rules: 'Include at least one youth organisation and one organisation with policy expertise.' },
          { title: 'Role distribution and commitment', maxScore: 2, mandatory: 1, meaning: 'Roles are clearly distributed with balanced workload and genuine commitment.', structure: 'RACI matrix (Responsible, Accountable, Consulted, Informed) for all WPs.', relations: 'Role distribution matches partner expertise and capacity.', rules: 'Each partner must lead at least one WP or major deliverable.' },
          { title: 'Previous cooperation experience', maxScore: 2, mandatory: 0, meaning: 'Partners have worked together before or demonstrate capacity for new collaboration.', structure: 'History of previous collaboration or clear plan for building team cohesion.', relations: 'Prior cooperation reduces partnership risks and accelerates project start-up.', rules: 'If new partnership, include team-building activities in the first 3 months.' }
        ]
      },
      { code: '3.2', title: 'Cooperation mechanisms and task allocation',
        prompt: 'How will partners cooperate in practice? Are the cooperation mechanisms clearly defined?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Partnership agreement framework', maxScore: 2, mandatory: 1, meaning: 'A clear partnership agreement defines rights, obligations and procedures.', structure: 'Summary of partnership agreement covering IP, decision-making, conflict resolution.', relations: 'Agreement must be consistent with the grant agreement requirements.', rules: 'Partnership agreement must be signed before project start date.' },
          { title: 'Coordination and communication tools', maxScore: 2, mandatory: 1, meaning: 'Practical tools and platforms for day-to-day cooperation are defined.', structure: 'List of tools: project management platform, file sharing, video conferencing, messaging.', relations: 'Tools must be accessible to all partners regardless of technical capacity.', rules: 'Include at least one shared document repository and one real-time communication tool.' },
          { title: 'Transnational meetings plan', maxScore: 2, mandatory: 1, meaning: 'Face-to-face and virtual meetings are planned with clear purposes.', structure: 'Meeting calendar with type, location, duration, participants and objectives.', relations: 'Each meeting must have a clear agenda linked to project milestones.', rules: 'Plan at least 2 face-to-face transnational meetings per year.' },
          { title: 'Decision-making procedures', maxScore: 2, mandatory: 1, meaning: 'Clear and fair decision-making processes are established.', structure: 'Description of decision types (operational, strategic) and who decides what.', relations: 'Decision-making must balance efficiency with partner inclusivity.', rules: 'Define quorum rules and escalation procedures for disputes.' },
          { title: 'Knowledge sharing mechanisms', maxScore: 2, mandatory: 0, meaning: 'Partners actively share knowledge and learn from each other.', structure: 'Plan for peer learning, study visits, staff exchanges or joint training.', relations: 'Knowledge sharing strengthens the partnership and improves project quality.', rules: 'Include at least one capacity-building activity for the partnership itself.' }
        ]
      }
    ]},
    { title: '4. Impact, dissemination and sustainability', questions: [
      { code: '4.1', title: 'Expected impact and outcomes',
        prompt: 'What is the expected impact at participant, organisational, local, national and European level?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Impact on participants', maxScore: 2, mandatory: 1, meaning: 'Clear and measurable impact on direct participants.', structure: 'Description of expected changes in knowledge, skills, attitudes and behaviour.', relations: 'Participant impact must link to learning objectives and activity design.', rules: 'Use pre/post assessment methodology to measure participant-level change.' },
          { title: 'Organisational impact', maxScore: 2, mandatory: 1, meaning: 'The project strengthens partner organisations capacity and practice.', structure: 'Description of how each partner will be strengthened (new methods, networks, skills).', relations: 'Organisational development is both a means and an end of the project.', rules: 'Include concrete examples of how partners will change their practice after the project.' },
          { title: 'Policy impact', maxScore: 2, mandatory: 1, meaning: 'The project contributes to policy development at local, national or EU level.', structure: 'Policy impact pathway: evidence → recommendations → advocacy → policy change.', relations: 'Policy impact connects to the EU added value described in section 1.2.', rules: 'Include at least one concrete policy recommendation or advocacy action.' },
          { title: 'Impact measurement plan', maxScore: 2, mandatory: 1, meaning: 'A clear plan for measuring and documenting impact is in place.', structure: 'Monitoring and evaluation framework with indicators, baselines, targets and methods.', relations: 'M&E framework must cover all levels of impact (participant to systemic).', rules: 'Include both quantitative indicators and qualitative assessment methods.' },
          { title: 'Wider societal impact', maxScore: 2, mandatory: 0, meaning: 'The project contributes to broader societal challenges beyond the immediate scope.', structure: 'Description of how the project addresses cross-cutting issues (environment, digital, inclusion).', relations: 'Societal impact amplifies the European added value of the project.', rules: 'Link to at least one UN Sustainable Development Goal.' }
        ]
      },
      { code: '4.2', title: 'Dissemination and communication',
        prompt: 'How will the project results be disseminated to reach the widest possible audience?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Dissemination strategy', maxScore: 2, mandatory: 1, meaning: 'A comprehensive plan for sharing project results with relevant audiences.', structure: 'Dissemination plan with target audiences, channels, messages and timeline.', relations: 'Dissemination targets must include stakeholders beyond the partnership.', rules: 'Include both academic/professional and general public dissemination channels.' },
          { title: 'Communication plan', maxScore: 2, mandatory: 1, meaning: 'Professional communication activities to raise awareness and visibility.', structure: 'Communication plan with visual identity, social media strategy, press plan.', relations: 'Communication supports recruitment, engagement and dissemination goals.', rules: 'Must comply with Erasmus+ visibility requirements (logo, disclaimer, FTOP).' },
          { title: 'Intellectual outputs and publications', maxScore: 2, mandatory: 1, meaning: 'Tangible outputs that can be shared and reused by others.', structure: 'List of publications, toolkits, curricula, guidelines with format and distribution plan.', relations: 'Outputs must be licensed for open access (Creative Commons or equivalent).', rules: 'All major outputs must be available in at least 2 EU languages.' },
          { title: 'Multiplier events', maxScore: 2, mandatory: 1, meaning: 'Events designed to share results with wider audiences beyond the partnership.', structure: 'Plan for conferences, workshops, webinars targeting policy makers, practitioners, youth.', relations: 'Multiplier events should take place in the final third of the project.', rules: 'Plan at least one multiplier event per partner country.' },
          { title: 'Digital dissemination', maxScore: 2, mandatory: 0, meaning: 'Effective use of digital channels to maximise reach and engagement.', structure: 'Website, social media, newsletters, online platforms, Erasmus+ Project Results Platform.', relations: 'Digital channels complement face-to-face dissemination activities.', rules: 'Upload all results to the Erasmus+ Project Results Platform.' }
        ]
      },
      { code: '4.3', title: 'Sustainability and long-term impact',
        prompt: 'How will the project results be sustained after the EU funding period? What is the legacy plan?',
        maxScore: 10, threshold: 6,
        criteria: [
          { title: 'Sustainability plan', maxScore: 2, mandatory: 1, meaning: 'Clear plan for continuing activities and maintaining results after funding ends.', structure: 'Post-project plan covering financial sustainability, institutional embedding and network maintenance.', relations: 'Sustainability plan must be realistic given partners resources and commitments.', rules: 'Include at least 2 concrete sustainability mechanisms (mainstreaming, new funding, institutionalisation).' },
          { title: 'Institutional embedding', maxScore: 2, mandatory: 1, meaning: 'Project methods and results will be integrated into partner organisations regular work.', structure: 'Description of how each partner will mainstream project results into their programmes.', relations: 'Institutional embedding is the primary sustainability mechanism for youth projects.', rules: 'Include management-level commitment statements from partner organisations.' },
          { title: 'Financial sustainability', maxScore: 2, mandatory: 1, meaning: 'A plan for financing continued activities after EU funding.', structure: 'Revenue model: fees, memberships, new grants, public funding, corporate sponsorship.', relations: 'Financial plan must be proportionate to the scale of activities to be sustained.', rules: 'Identify at least 2 potential funding sources for post-project continuation.' },
          { title: 'Network and partnership continuity', maxScore: 2, mandatory: 1, meaning: 'The partnership will continue to collaborate beyond the project.', structure: 'Plan for maintaining the network: regular meetings, joint applications, shared platforms.', relations: 'Network continuity amplifies long-term impact and European cooperation.', rules: 'Include a memorandum of understanding for post-project cooperation.' },
          { title: 'Transferability and scaling', maxScore: 2, mandatory: 0, meaning: 'Results can be adapted and applied in other contexts, countries or sectors.', structure: 'Transferability analysis: what can be transferred, where, how, with what adaptations.', relations: 'Transferability increases the return on EU investment.', rules: 'Include at least one concrete plan for piloting results in a new context.' }
        ]
      }
    ]}
  ];

  let totalQ = 0, totalC = 0;
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    const secId = uuid();
    await conn.query('INSERT INTO eval_sections (id, program_id, title, color, sort_order) VALUES (?,?,?,?,?)',
      [secId, programId, sec.title, COLORS[si % COLORS.length], si]);
    for (let qi = 0; qi < sec.questions.length; qi++) {
      const q = sec.questions[qi];
      const qId = uuid();
      await conn.query('INSERT INTO eval_questions (id, section_id, code, title, description, max_score, threshold, general_rules, score_caps, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [qId, secId, q.code, q.title, q.prompt, q.maxScore, q.threshold, null, null, qi]);
      totalQ++;
      for (let ci = 0; ci < q.criteria.length; ci++) {
        const c = q.criteria[ci];
        await conn.query('INSERT INTO eval_criteria (id, question_id, title, max_score, mandatory, meaning, structure, relations, rules, red_flags, score_rubric, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          [uuid(), qId, c.title, c.maxScore, c.mandatory, c.meaning, c.structure, c.relations, c.rules, c.redFlags || null, c.scoreRubric ? JSON.stringify(c.scoreRubric) : null, ci]);
        totalC++;
      }
    }
  }

  console.log(`Done! Imported ${sections.length} sections, ${totalQ} questions, ${totalC} criteria for KA3`);
  await conn.end();
})();
