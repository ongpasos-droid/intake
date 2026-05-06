/**
 * Migration 089: Optional deliverable_id on milestones.
 * Lets a milestone explicitly track a deliverable (auto-generated 1:1
 * during auto-distribution) while still allowing standalone milestones
 * (kick-off, final report).
 */
module.exports = async function (conn) {
  const [cols] = await conn.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'milestones'`
  );
  const have = new Set(cols.map(c => c.COLUMN_NAME));

  if (!have.has('deliverable_id')) {
    await conn.execute(
      `ALTER TABLE milestones ADD COLUMN deliverable_id CHAR(36) DEFAULT NULL`
    );
    console.log('  ✓ milestones.deliverable_id');
  }
  try {
    await conn.execute(
      `ALTER TABLE milestones ADD INDEX idx_milestones_deliverable (deliverable_id)`
    );
    console.log('  ✓ idx_milestones_deliverable');
  } catch (err) {
    if (err.code !== 'ER_DUP_KEYNAME') throw err;
  }
  // FK with ON DELETE SET NULL so removing a deliverable doesn't cascade-kill its milestone
  try {
    await conn.execute(
      `ALTER TABLE milestones
         ADD CONSTRAINT fk_milestone_deliverable
         FOREIGN KEY (deliverable_id) REFERENCES deliverables(id) ON DELETE SET NULL`
    );
    console.log('  ✓ fk_milestone_deliverable');
  } catch (err) {
    if (err.code !== 'ER_FK_DUP_NAME' && err.code !== 'ER_DUP_KEYNAME') {
      // MySQL emits ER_CANT_CREATE_TABLE on dup FK in some versions — ignore
      if (!String(err.message).includes('Duplicate')) throw err;
    }
  }
};
