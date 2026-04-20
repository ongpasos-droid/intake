module.exports = async function(conn) {
  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities'`
  );
  const existing = new Set(cols.map(c => c.COLUMN_NAME));

  if (!existing.has('subtype')) {
    await conn.execute(`ALTER TABLE activities ADD COLUMN subtype VARCHAR(100) DEFAULT NULL AFTER label`);
    console.log('  ✓ activities.subtype added');
  }
  if (!existing.has('description')) {
    await conn.execute(`ALTER TABLE activities ADD COLUMN description TEXT DEFAULT NULL AFTER subtype`);
    console.log('  ✓ activities.description added');
  }
  if (!existing.has('date_start')) {
    await conn.execute(`ALTER TABLE activities ADD COLUMN date_start DATE DEFAULT NULL AFTER description`);
    console.log('  ✓ activities.date_start added');
  }
  if (!existing.has('date_end')) {
    await conn.execute(`ALTER TABLE activities ADD COLUMN date_end DATE DEFAULT NULL AFTER date_start`);
    console.log('  ✓ activities.date_end added');
  }
  if (!existing.has('online')) {
    await conn.execute(`ALTER TABLE activities ADD COLUMN online TINYINT(1) NOT NULL DEFAULT 0 AFTER date_end`);
    console.log('  ✓ activities.online added');
  }
};
