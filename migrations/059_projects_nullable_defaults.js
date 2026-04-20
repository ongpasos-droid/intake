module.exports = async function(db) {
  await db.query("ALTER TABLE projects MODIFY start_date DATE DEFAULT NULL");
  await db.query("ALTER TABLE projects MODIFY duration_months INT DEFAULT 24");
  await db.query("ALTER TABLE projects MODIFY eu_grant DECIMAL(12,2) DEFAULT 0");
  await db.query("ALTER TABLE projects MODIFY cofin_pct INT DEFAULT 80");
  await db.query("ALTER TABLE projects MODIFY indirect_pct DECIMAL(5,2) DEFAULT 7");
};
