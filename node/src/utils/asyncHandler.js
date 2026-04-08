/**
 * asyncHandler — Envuelve un controlador async y captura errores automáticamente.
 * Elimina la necesidad de try-catch en cada endpoint.
 *
 * Uso:
 *   exports.listPrograms = asyncHandler(async (req, res) => {
 *     const data = await m.listPrograms();
 *     res.json({ ok: true, data });
 *   });
 */
module.exports = function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error('[API Error]', err.message);
      res.status(500).json({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: err.message }
      });
    });
  };
};
