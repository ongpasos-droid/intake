'use strict';

const { loadFormBContext } = require('./model');
const { renderFormBDocx } = require('./render-form-b');

// GET /v1/exporter/projects/:projectId/form-part-b.docx
exports.exportFormPartBDocx = async (req, res, next) => {
  try {
    const ctx = await loadFormBContext(req.params.projectId, req.user.id);
    const buffer = await renderFormBDocx(ctx);
    const safeName = (ctx.project.name || 'project').replace(/[^a-z0-9._-]/gi, '_');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_FormPartB.docx"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (err) { next(err); }
};

// GET /v1/exporter/projects/:projectId/form-part-b/preview.json
// Lightweight check — what we'd render, without producing the binary.
exports.previewFormPartB = async (req, res, next) => {
  try {
    const ctx = await loadFormBContext(req.params.projectId, req.user.id);
    const writer = ctx.writer || {};
    const sections = [
      { id: 'summary',   field: 'summary_text', filled: !!writer.summary_text },
      { id: 's1_1',      field: 's1_1_text',    filled: !!writer.s1_1_text },
      { id: 's1_2',      field: 's1_2_text',    filled: !!writer.s1_2_text },
      { id: 's1_3',      field: 's1_3_text',    filled: !!writer.s1_3_text },
      { id: 's2_1_1',    field: 's2_1_1_text',  filled: !!writer.s2_1_1_text },
      { id: 's2_1_2',    field: 's2_1_2_text',  filled: !!writer.s2_1_2_text },
      { id: 's2_1_3',    field: 's2_1_3_staff_table', filled: !!writer.s2_1_3_staff_table },
      { id: 's2_1_4',    field: 's2_1_4_text',  filled: !!writer.s2_1_4_text },
      { id: 's2_1_5',    field: 's2_1_5_risk_table', filled: !!writer.s2_1_5_risk_table },
      { id: 's2_2_1',    field: 's2_2_1_text',  filled: !!writer.s2_2_1_text },
      { id: 's2_2_2',    field: 's2_2_2_text',  filled: !!writer.s2_2_2_text },
      { id: 's3_1',      field: 's3_1_text',    filled: !!writer.s3_1_text },
      { id: 's3_2',      field: 's3_2_text',    filled: !!writer.s3_2_text },
      { id: 's3_3',      field: 's3_3_text',    filled: !!writer.s3_3_text },
      { id: 's4_1',      field: 's4_1_text',    filled: !!writer.s4_1_text },
      { id: 's5_1',      field: 's5_1_text',    filled: !!writer.s5_1_text },
      { id: 's5_2',      field: 's5_2_text',    filled: !!writer.s5_2_text },
      { id: 's6_1',      field: 's6_1_details', filled: !!writer.s6_1_details },
      { id: 's6_2',      field: 's6_2_justification', filled: !!writer.s6_2_justification },
    ];
    res.json({
      ok: true,
      data: {
        project: { id: ctx.project.id, name: ctx.project.name, type: ctx.project.type },
        wp_count: ctx.wps.length,
        activity_count: ctx.activities.length,
        deliverable_count: ctx.deliverables.length,
        milestone_count: ctx.milestones.length,
        partner_count: ctx.partners.length,
        eu_projects_count: ctx.euProjects.length,
        sections,
        wp_writer_text: ctx.wps.map(w => ({
          code: w.code, title: w.title, has_writer_text: !!w.writerText,
        })),
      },
    });
  } catch (err) { next(err); }
};
