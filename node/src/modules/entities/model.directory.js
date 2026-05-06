/* ═══════════════════════════════════════════════════════════════
   Entities Model — directory-api backend (HTTP proxy)
   ═══════════════════════════════════════════════════════════════
   STUB implementation. Usado cuando ENTITIES_BACKEND=directory_api.

   Estado actual: los endpoints del directory-api del VPS aún
   no soportan toda la superficie que necesita la app (Sprint 1
   pendiente — ver docs/handoffs/PARA_VPS.md).

   Cuando VPS Claude entregue Sprint 1, este módulo se completará
   delegando en `node/src/utils/directory-api.js`. Hasta entonces,
   activar ENTITIES_BACKEND=directory_api debe fallar de forma
   ruidosa para que nadie lo encienda en producción por error.
   ═══════════════════════════════════════════════════════════════ */

const dir = require('../../utils/directory-api');

function notImplemented(method) {
  const err = new Error(
    `entities/model.directory.${method}() not yet implemented. ` +
    `Waiting for VPS Sprint 1 endpoints (see docs/DIRECTORY_REFACTOR_PLAN.md L2-cutover).`
  );
  err.code = 'NOT_IMPLEMENTED';
  return err;
}

async function listEntities(_args = {}) {
  // TODO Sprint 1: dir.search(args) -> mapear a la shape que espera controller
  throw notImplemented('listEntities');
}

async function getEntityById(_oid) {
  // TODO Sprint 1: dir.getEntityFull(oid) -> shape compatible con v_entities_public
  throw notImplemented('getEntityById');
}

async function listSimilar(_oid, _limit) {
  // TODO Sprint 2: dir.getEntitySimilar(oid, { limit })
  throw notImplemented('listSimilar');
}

async function listGeoMarkers(_args = {}) {
  // TODO Sprint 1: dir.getMapMarkers(args)
  throw notImplemented('listGeoMarkers');
}

module.exports = {
  listEntities,
  getEntityById,
  listSimilar,
  listGeoMarkers,
  // Helpers expuestos por si las pruebas los necesitan:
  _client: dir,
};
