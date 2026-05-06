/* ═══════════════════════════════════════════════════════════════
   Shortlists Model — Partner pool por usuario
   ═══════════════════════════════════════════════════════════════ */

const pool = require('../../utils/db');
const uuid = require('../../utils/uuid');

/* ── Listas del usuario con conteo de items ─────────────────── */
async function listShortlists(userId) {
  const [rows] = await pool.query(
    `SELECT s.id, s.name, s.description, s.is_default, s.created_at, s.updated_at,
       (SELECT COUNT(*) FROM entity_shortlist_items i WHERE i.shortlist_id = s.id) AS item_count
     FROM entity_shortlists s
     WHERE s.user_id = ?
     ORDER BY s.is_default DESC, s.created_at ASC`,
    [userId]
  );
  return rows;
}

/* ── Obtener (o crear) shortlist por defecto del usuario ───── */
async function ensureDefault(userId) {
  const [rows] = await pool.query(
    `SELECT id FROM entity_shortlists WHERE user_id = ? AND is_default = 1 LIMIT 1`,
    [userId]
  );
  if (rows.length) return rows[0].id;
  const id = uuid();
  await pool.query(
    `INSERT INTO entity_shortlists (id, user_id, name, description, is_default)
     VALUES (?, ?, 'Mi Pool', 'Entidades guardadas para futuras propuestas', 1)`,
    [id, userId]
  );
  return id;
}

/* ── Crear shortlist nueva ──────────────────────────────────── */
async function createShortlist(userId, { name, description }) {
  const id = uuid();
  await pool.query(
    `INSERT INTO entity_shortlists (id, user_id, name, description, is_default) VALUES (?, ?, ?, ?, 0)`,
    [id, userId, name || 'Sin título', description || null]
  );
  return id;
}

/* ── Actualizar shortlist (rename / desc) ───────────────────── */
async function updateShortlist(userId, id, { name, description }) {
  const sets = [];
  const params = [];
  if (name !== undefined)        { sets.push('name = ?');        params.push(name); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description); }
  if (!sets.length) return;
  params.push(id, userId);
  await pool.query(
    `UPDATE entity_shortlists SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );
}

async function deleteShortlist(userId, id) {
  await pool.query(`DELETE FROM entity_shortlists WHERE id = ? AND user_id = ?`, [id, userId]);
}

/* ── Verificar ownership ────────────────────────────────────── */
async function isOwner(userId, shortlistId) {
  const [rows] = await pool.query(
    `SELECT 1 FROM entity_shortlists WHERE id = ? AND user_id = ? LIMIT 1`,
    [shortlistId, userId]
  );
  return rows.length > 0;
}

/* ── Items: listar (joineado con vista pública) ──────────────── */
async function getShortlistDetail(userId, id) {
  const [[head]] = await pool.query(
    `SELECT s.id, s.name, s.description, s.is_default, s.created_at, s.updated_at
     FROM entity_shortlists s WHERE s.id = ? AND s.user_id = ?`,
    [id, userId]
  );
  if (!head) return null;
  const [items] = await pool.query(
    `SELECT v.oid, v.display_name, v.country_code, v.city, v.category, v.logo_url,
            v.score_professionalism, v.score_eu_readiness, v.score_vitality,
            v.cms_detected, v.quality_tier, v.quality_score_raw,
            v.emails, v.phones, v.website,
            i.notes, i.added_at
     FROM entity_shortlist_items i
     LEFT JOIN v_entities_public v ON v.oid = i.oid
     WHERE i.shortlist_id = ?
     ORDER BY i.added_at DESC`,
    [id]
  );
  return { ...head, items };
}

/* ── Items: añadir / quitar ─────────────────────────────────── */
async function addItem(userId, shortlistId, oid, notes) {
  await pool.query(
    `INSERT IGNORE INTO entity_shortlist_items (shortlist_id, oid, notes) VALUES (?, ?, ?)`,
    [shortlistId, oid, notes || null]
  );
  await pool.query(`UPDATE entity_shortlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`, [shortlistId, userId]);
}
async function removeItem(userId, shortlistId, oid) {
  await pool.query(
    `DELETE FROM entity_shortlist_items WHERE shortlist_id = ? AND oid = ?`,
    [shortlistId, oid]
  );
  await pool.query(`UPDATE entity_shortlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`, [shortlistId, userId]);
}

/* ── Toggle en la default shortlist (heart icon) ─────────────── */
async function toggleInDefault(userId, oid) {
  const sid = await ensureDefault(userId);
  const [rows] = await pool.query(
    `SELECT 1 FROM entity_shortlist_items WHERE shortlist_id = ? AND oid = ? LIMIT 1`,
    [sid, oid]
  );
  if (rows.length) {
    await removeItem(userId, sid, oid);
    return { added: false, shortlist_id: sid };
  }
  await addItem(userId, sid, oid, null);
  return { added: true, shortlist_id: sid };
}

/* ── Comprobar qué OIDs están en cualquier shortlist del user ── */
async function getSavedOids(userId, oids) {
  if (!oids?.length) return [];
  const [rows] = await pool.query(
    `SELECT DISTINCT i.oid FROM entity_shortlist_items i
     JOIN entity_shortlists s ON s.id = i.shortlist_id
     WHERE s.user_id = ? AND i.oid IN (?)`,
    [userId, oids]
  );
  return rows.map(r => r.oid);
}

module.exports = {
  listShortlists, ensureDefault, createShortlist, updateShortlist, deleteShortlist,
  isOwner, getShortlistDetail, addItem, removeItem, toggleInDefault, getSavedOids,
};
