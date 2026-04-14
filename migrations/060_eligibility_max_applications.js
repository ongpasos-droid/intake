// Migration 060: Add max_partner_applications and max_applicant_applications to call_eligibility

module.exports = async function(conn) {
  const [cols] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'call_eligibility'`
  );
  const existing = cols.map(c => c.COLUMN_NAME);

  if (!existing.includes('max_partner_applications')) {
    await conn.query(`ALTER TABLE call_eligibility ADD COLUMN max_partner_applications INT DEFAULT NULL AFTER max_coord_applications`);
  }
  if (!existing.includes('max_applicant_applications')) {
    await conn.query(`ALTER TABLE call_eligibility ADD COLUMN max_applicant_applications INT DEFAULT NULL AFTER max_partner_applications`);
  }

  console.log('[060] call_eligibility: max_partner_applications + max_applicant_applications added');
};
