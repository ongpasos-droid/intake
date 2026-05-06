/* ── GHL sync — newsletter subscribers → GHL contacts ───────────────── */
/*
 * High-level sync helpers used by other modules.
 * All functions are fire-and-forget friendly: they return a Promise
 * that resolves to { ok, ... } and never throws.
 *
 * Tag taxonomy in GHL (prefixed to avoid collisions with the user's
 * other workflows in the same location):
 *   efs:cold        first signup from WP form / blog
 *   efs:warm        signed in / created an account in the tool
 *   efs:hot         created a real (non-sandbox) project
 *   efs:source-XXX  origin of the lead (efs:source-blog_post, etc.)
 */

const client = require('./client');

const TAG_PREFIX = 'efs:';
const SUPPORTED_TAGS = ['cold', 'warm', 'hot'];

function tagFor(tag) {
  if (!SUPPORTED_TAGS.includes(tag)) return null;
  return `${TAG_PREFIX}${tag}`;
}

function sourceTag(source) {
  if (!source) return null;
  const safe = String(source).replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
  return safe ? `${TAG_PREFIX}source-${safe}` : null;
}

/**
 * Upsert a contact in GHL based on email.
 * Adds the tag for cold/warm/hot and the source tag.
 *
 * @param {object} args
 * @param {string} args.email   required
 * @param {string} args.tag     'cold' | 'warm' | 'hot'
 * @param {string} args.source  e.g. 'blog_post', 'wp', 'tool_signup'
 * @returns {Promise<{ok, skipped?, contactId?, error?}>}
 */
async function upsertContact({ email, tag = 'cold', source = null } = {}) {
  if (!client.isEnabled()) return { ok: false, skipped: true };
  if (!email) return { ok: false, error: 'email required' };

  const tags = [];
  const t = tagFor(tag);
  const s = sourceTag(source);
  if (t) tags.push(t);
  if (s) tags.push(s);

  const body = {
    locationId: process.env.GHL_LOCATION_ID,
    email: String(email).trim().toLowerCase(),
    tags,
  };

  const res = await client.request('POST', '/contacts/upsert', body);
  if (!res.ok) {
    console.warn('[GHL] upsert failed:', res.error || res.status);
    return res;
  }
  // V2 upsert returns { contact: { id, ... }, new: bool }
  const contactId = res.data?.contact?.id || res.data?.id || null;
  return { ok: true, contactId, isNew: Boolean(res.data?.new) };
}

/**
 * Add a single tag to an existing contact (by email). Used when promoting
 * cold→warm→hot without touching other tags.
 */
async function addTagByEmail(email, tag) {
  const t = tagFor(tag);
  if (!t) return { ok: false, error: `unsupported tag ${tag}` };
  // V2 has /contacts/upsert which is idempotent and merges tags — easiest path.
  return upsertContact({ email, tag });
}

module.exports = {
  upsertContact,
  addTagByEmail,
  TAG_PREFIX,
  SUPPORTED_TAGS,
};
