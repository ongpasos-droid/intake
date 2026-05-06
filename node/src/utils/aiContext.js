/* ══ AI request context (AsyncLocalStorage) ═══════════════════════
   Propagates { userId, endpoint, projectId } down to the Claude
   utility without threading args through every call in the stack.
   Middleware in server.js wraps each /v1/... request in als.run({...}).
   ═══════════════════════════════════════════════════════════════ */

const { AsyncLocalStorage } = require('node:async_hooks');

const als = new AsyncLocalStorage();

function run(ctx, fn) {
  return als.run(ctx || {}, fn);
}

function get() {
  return als.getStore() || {};
}

function set(patch) {
  const store = als.getStore();
  if (store) Object.assign(store, patch);
}

module.exports = { run, get, set };
