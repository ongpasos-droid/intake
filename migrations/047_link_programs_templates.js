const fs = require('fs');
const path = require('path');

module.exports = async function(db) {
  // 1. Add form_template_id column to intake_programs if missing
  const [cols] = await db.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='intake_programs' AND COLUMN_NAME='form_template_id'"
  );
  if (!cols.length) {
    await db.query("ALTER TABLE intake_programs ADD COLUMN form_template_id CHAR(36) DEFAULT NULL");
  }

  // 2. Load the EACEA BB template JSON into the seeded row
  const jsonPath = path.join(__dirname, '..', 'docs', 'form_part_b_eacea.json');
  if (fs.existsSync(jsonPath)) {
    const templateJson = fs.readFileSync(jsonPath, 'utf8');
    await db.query(
      "UPDATE form_templates SET template_json = ? WHERE id = '00000000-0000-4000-b000-000000000001'",
      [templateJson]
    );
  }

  // 3. Link KA3 program to this template
  await db.query(
    "UPDATE intake_programs SET form_template_id = '00000000-0000-4000-b000-000000000001' WHERE id = '00000000-0000-4000-a000-000000000001'"
  );
};
