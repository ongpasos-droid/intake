/* ── Organizations Controller ─────────────────────────────────── */
const m = require('./model');
const path = require('path');

const ok  = (res, data) => res.json({ ok: true, data });
const err = (res, msg, status = 400) =>
  res.status(status).json({ ok: false, error: { message: msg } });

/* ── My Organization ─────────────────────────────────────────── */

exports.getMyOrg = async (req, res) => {
  try {
    const org = await m.getOrgByUserId(req.user.id);
    ok(res, org);
  } catch (e) { err(res, e.message, 500); }
};

exports.getMyOrgs = async (req, res) => {
  try {
    const orgs = await m.getOrgsByUserId(req.user.id);
    ok(res, orgs);
  } catch (e) { err(res, e.message, 500); }
};

exports.upsertMyOrg = async (req, res) => {
  try {
    const existing = await m.getOrgByUserId(req.user.id);
    if (existing) {
      await m.upsertOrg(req.body, existing.id);
      ok(res, { id: existing.id });
    } else {
      const id = await m.upsertOrg({ ...req.body, owner_user_id: req.user.id }, null);
      await m.linkUserToOrg(req.user.id, id);
      ok(res, { id });
    }
  } catch (e) { err(res, e.message, 500); }
};

/* ── Directory ───────────────────────────────────────────────── */

exports.listOrgs = async (req, res) => {
  try {
    const result = await m.listOrgs(req.query);
    res.json({ ok: true, ...result });
  } catch (e) { err(res, e.message, 500); }
};

exports.getOrg = async (req, res) => {
  try {
    const org = await m.getOrgById(req.params.id);
    if (!org) return err(res, 'Organization not found', 404);
    ok(res, org);
  } catch (e) { err(res, e.message, 500); }
};

/* ── Child resources ─────────────────────────────────────────── */

exports.listChildren = async (req, res) => {
  try {
    ok(res, await m.listChildren(req.params.type, req.params.orgId));
  } catch (e) { err(res, e.message, 500); }
};

exports.addChild = async (req, res) => {
  try {
    const owner = await m.isOrgOwner(req.user.id, req.params.orgId);
    if (!owner && req.user.role !== 'admin') return err(res, 'Forbidden', 403);
    const id = await m.upsertChild(req.params.type, req.params.orgId, req.body, null);
    ok(res, { id });
  } catch (e) { err(res, e.message, 500); }
};

exports.updateChild = async (req, res) => {
  try {
    const owner = await m.isOrgOwner(req.user.id, req.params.orgId);
    if (!owner && req.user.role !== 'admin') return err(res, 'Forbidden', 403);
    await m.upsertChild(req.params.type, req.params.orgId, req.body, req.params.id);
    ok(res, { id: req.params.id });
  } catch (e) { err(res, e.message, 500); }
};

exports.deleteChild = async (req, res) => {
  try {
    const owner = await m.isOrgOwner(req.user.id, req.params.orgId);
    if (!owner && req.user.role !== 'admin') return err(res, 'Forbidden', 403);
    await m.deleteChild(req.params.type, req.params.id, req.params.orgId);
    ok(res, null);
  } catch (e) { err(res, e.message, 500); }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return err(res, 'No file uploaded');
    const existing = await m.getOrgByUserId(req.user.id);
    if (!existing) return err(res, 'Create your organization first', 404);
    const logoUrl = '/uploads/logos/' + req.file.filename;
    await m.upsertOrg({ logo_url: logoUrl }, existing.id);
    ok(res, { logo_url: logoUrl });
  } catch (e) { err(res, e.message, 500); }
};
