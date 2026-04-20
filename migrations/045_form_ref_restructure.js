// 045: Add form_ref to eval_sections, restructure question codes to match real Form Part B
// Moves questions between sections to match form structure vs evaluation structure
// Idempotent: checks column existence, uses code matching for updates

const { v4: uuid } = require('uuid');

module.exports = async function(pool) {
  // --- 1. Add form_ref column if missing ---
  const [cols] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='eval_sections' AND COLUMN_NAME='form_ref'"
  );
  if (!cols.length) {
    await pool.query("ALTER TABLE eval_sections ADD COLUMN form_ref VARCHAR(10) DEFAULT NULL AFTER title");
  }

  // --- 2. Find KA3 programme(s) ---
  const [programs] = await pool.query(
    "SELECT id FROM intake_programs WHERE action_type LIKE 'KA3%' OR name LIKE '%KA3%' OR name LIKE '%Youth Together%'"
  );
  if (!programs.length) return;

  for (const prog of programs) {
    // Load current sections
    const [sections] = await pool.query(
      'SELECT id, title, sort_order FROM eval_sections WHERE program_id = ? ORDER BY sort_order',
      [prog.id]
    );
    if (!sections.length) continue;

    // Helper: find section by title pattern
    const findSec = (pattern) => sections.find(s => s.title.toLowerCase().includes(pattern.toLowerCase()));

    const sec1 = findSec('Relevance');
    const sec2 = findSec('Quality of project design') || findSec('Quality');
    const sec3 = findSec('partnership');
    const sec4 = findSec('Impact');
    const sec5 = findSec('Work plan');

    // --- 3. Set form_ref on existing sections ---
    if (sec1) await pool.query('UPDATE eval_sections SET form_ref=?, title=? WHERE id=?', ['1', '1. Relevance of the project', sec1.id]);
    if (sec2) await pool.query('UPDATE eval_sections SET form_ref=?, title=? WHERE id=?', ['2.1', '2.1 Quality of project design and implementation', sec2.id]);
    if (sec3) await pool.query('UPDATE eval_sections SET form_ref=?, title=? WHERE id=?', ['2.2', '2.2 Quality of the partnership and cooperation', sec3.id]);
    if (sec4) await pool.query('UPDATE eval_sections SET form_ref=?, title=? WHERE id=?', ['3', '3. Impact, dissemination and sustainability', sec4.id]);
    if (sec5) await pool.query('UPDATE eval_sections SET form_ref=?, title=? WHERE id=?', ['4', '4. Work plan, work packages and resources', sec5.id]);

    // --- 4. Restructure question codes ---

    // Section 2 (Quality / form 2.1): 2.1→2.1.1, 2.2→2.1.2, 2.3→2.1.4
    if (sec2) {
      await pool.query("UPDATE eval_questions SET code='2.1.1', sort_order=0 WHERE section_id=? AND code='2.1'", [sec2.id]);
      await pool.query("UPDATE eval_questions SET code='2.1.2', sort_order=1 WHERE section_id=? AND code='2.2'", [sec2.id]);
      await pool.query("UPDATE eval_questions SET code='2.1.4', title='Cost effectiveness and financial management', sort_order=3 WHERE section_id=? AND code='2.3'", [sec2.id]);

      // Move 5.3 (Project teams) from Section 5 to Section 2 as 2.1.3
      if (sec5) {
        const [q53] = await pool.query("SELECT id FROM eval_questions WHERE section_id=? AND code='5.3'", [sec5.id]);
        if (q53.length) {
          await pool.query("UPDATE eval_questions SET section_id=?, code='2.1.3', title='Project teams, staff and experts', sort_order=2 WHERE id=?", [sec2.id, q53[0].id]);
        } else {
          // Create 2.1.3 if it doesn't exist
          const [existing] = await pool.query("SELECT id FROM eval_questions WHERE section_id=? AND code='2.1.3'", [sec2.id]);
          if (!existing.length) {
            await pool.query('INSERT INTO eval_questions (id, section_id, code, title, max_score, sort_order) VALUES (?,?,?,?,?,?)',
              [uuid(), sec2.id, '2.1.3', 'Project teams, staff and experts', 0, 2]);
          }
        }

        // Move 5.4 (Risk management) from Section 5 to Section 2 as 2.1.5
        const [q54] = await pool.query("SELECT id FROM eval_questions WHERE section_id=? AND code='5.4'", [sec5.id]);
        if (q54.length) {
          await pool.query("UPDATE eval_questions SET section_id=?, code='2.1.5', title='Risk management', sort_order=4 WHERE id=?", [sec2.id, q54[0].id]);
        } else {
          const [existing] = await pool.query("SELECT id FROM eval_questions WHERE section_id=? AND code='2.1.5'", [sec2.id]);
          if (!existing.length) {
            await pool.query('INSERT INTO eval_questions (id, section_id, code, title, max_score, sort_order) VALUES (?,?,?,?,?,?)',
              [uuid(), sec2.id, '2.1.5', 'Risk management', 0, 4]);
          }
        }
      }
    }

    // Section 3 (Partnership / form 2.2): 3.1→2.2.1, 3.2→2.2.2
    if (sec3) {
      await pool.query("UPDATE eval_questions SET code='2.2.1', title='Consortium set-up and division of roles' WHERE section_id=? AND code='3.1'", [sec3.id]);
      await pool.query("UPDATE eval_questions SET code='2.2.2' WHERE section_id=? AND code='3.2'", [sec3.id]);
    }

    // Section 4 (Impact / form 3): 4.1→3.1, 4.2→3.2, 4.3→3.3
    if (sec4) {
      await pool.query("UPDATE eval_questions SET code='3.1' WHERE section_id=? AND code='4.1'", [sec4.id]);
      await pool.query("UPDATE eval_questions SET code='3.2' WHERE section_id=? AND code='4.2'", [sec4.id]);
      await pool.query("UPDATE eval_questions SET code='3.3' WHERE section_id=? AND code='4.3'", [sec4.id]);
    }

    // Section 5 (Work plan / form 4): 5.1→4.1, 5.2→4.2
    if (sec5) {
      await pool.query("UPDATE eval_questions SET code='4.1' WHERE section_id=? AND code='5.1'", [sec5.id]);
      await pool.query("UPDATE eval_questions SET code='4.2' WHERE section_id=? AND code='5.2'", [sec5.id]);
    }

    // --- 5. Create Section 6 (Other / form 5) if missing ---
    const sec6 = findSec('Other');
    if (!sec6) {
      const [existingByRef] = await pool.query("SELECT id FROM eval_sections WHERE program_id=? AND form_ref='5'", [prog.id]);
      if (!existingByRef.length) {
        const secId = uuid();
        await pool.query(
          'INSERT INTO eval_sections (id, program_id, title, form_ref, color, max_score, eval_notes, sort_order) VALUES (?,?,?,?,?,?,?,?)',
          [secId, prog.id, '5. Other', '5', '#9ca3af', 0,
          `OTHER SECTIONS (no direct evaluation score)

These sections are mandatory parts of the application form but do not carry evaluation points. However, non-compliance with ethics or security requirements can lead to proposal rejection.

• Ethics: Address any ethical issues that may arise during the project. If the project involves ethical aspects (e.g. working with minors, data protection, research involving human participants), describe how they will be handled in compliance with EU regulations and national legislation.

• Security: If the project involves security-sensitive activities or EU-classified information, describe the measures in place to ensure compliance with applicable regulations.`,
          5]
        );
        await pool.query('INSERT INTO eval_questions (id, section_id, code, title, max_score, sort_order) VALUES (?,?,?,?,?,?)',
          [uuid(), secId, '5.1', 'Ethics', 0, 0]);
        await pool.query('INSERT INTO eval_questions (id, section_id, code, title, max_score, sort_order) VALUES (?,?,?,?,?,?)',
          [uuid(), secId, '5.2', 'Security', 0, 1]);
      }
    }
  }
};
