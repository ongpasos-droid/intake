module.exports = async function(db) {
  const [cols] = await db.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='intake_programs' AND COLUMN_NAME IN ('intake_template','budget_template')"
  );
  const existing = cols.map(c => c.COLUMN_NAME);

  if (!existing.includes('intake_template')) {
    await db.query("ALTER TABLE intake_programs ADD COLUMN intake_template VARCHAR(40) NOT NULL DEFAULT 'eacea_standard'");
  }
  if (!existing.includes('budget_template')) {
    await db.query("ALTER TABLE intake_programs ADD COLUMN budget_template VARCHAR(40) NOT NULL DEFAULT 'eacea_lump_sum'");
  }
};
