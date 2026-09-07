/* ── Claude CLI (suscripción) ─────────────────────────────────────────
   Invoca el Claude Code instalado y autenticado con la suscripción de
   Óscar, en modo headless (`claude -p`, prompt por stdin). NO usa la API
   (ANTHROPIC_API_KEY) — cero coste medido. Regla de negocio: la API solo
   se usa bajo autorización expresa de Óscar; este util es la vía "de
   momento" para features de IA en local.

   En entornos sin el CLI (contenedor de prod) `spawn` fallaría con ENOENT,
   así que ahí se usa el **ai-bridge**: un servicio del host que expone ese
   mismo `claude -p` por HTTP a la red interna de Docker (sigue siendo la
   suscripción, no la API). Se activa poniendo AI_BRIDGE_URL; sin ella, el
   comportamiento es el de siempre (spawn local).

   Si no hay ni CLI ni puente, el llamante debe degradar con un mensaje claro.

   Se puede desactivar explícitamente con VISION_AI_SUBSCRIPTION=off.     */

const { spawn } = require('child_process');
const os = require('os');

const BRIDGE_URL = (process.env.AI_BRIDGE_URL || '').trim();

function available() {
  return process.env.VISION_AI_SUBSCRIPTION !== 'off';
}

/* Puente HTTP al CLI del host. Mismos errores que la vía local, para que
   el llamante no tenga que distinguir de dónde vino la respuesta.        */
async function runViaBridge(prompt, { timeoutMs, model }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(BRIDGE_URL.replace(/\/$/, '') + '/run', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Token': process.env.AI_BRIDGE_TOKEN || '',
      },
      body: JSON.stringify({ prompt, model, timeoutMs }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok) return String(body.text || '').trim();
    const e = new Error('ai-bridge ' + res.status + ': ' + (body.error || 'sin detalle'));
    e.code = body.code || (res.status === 429 ? 'AI_BUSY' : 'AI_ERROR');
    throw e;
  } catch (e) {
    if (e.name === 'AbortError') { const t = new Error('ai-bridge timeout'); t.code = 'AI_TIMEOUT'; throw t; }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ejecuta un prompt de un solo turno contra el Claude de suscripción.
 * @param {string} prompt  Prompt completo y autocontenido.
 * @param {object} opts     { timeoutMs?, model? }
 * @returns {Promise<string>} Texto de la respuesta (stdout, trim).
 */
function runSubscription(prompt, { timeoutMs = 180000, model } = {}) {
  if (!available()) {
    const e = new Error('claude-cli disabled (VISION_AI_SUBSCRIPTION=off)');
    e.code = 'AI_DISABLED';
    return Promise.reject(e);
  }
  if (BRIDGE_URL) return runViaBridge(prompt, { timeoutMs, model });
  return new Promise((resolve, reject) => {
    const args = ['-p'];
    if (model) args.push('--model', model);
    // shell:true → compat Windows (claude es un shim npm .cmd). El prompt
    // va por stdin, no por la línea de comandos, así que no hay inyección.
    const child = spawn('claude', args, { shell: true, windowsHide: true, cwd: os.tmpdir() });
    let out = '', err = '';
    const timer = setTimeout(() => { try { child.kill(); } catch {} const e = new Error('claude-cli timeout'); e.code = 'AI_TIMEOUT'; reject(e); }, timeoutMs);
    child.stdout.on('data', d => { out += d.toString(); });
    child.stderr.on('data', d => { err += d.toString(); });
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(out.trim());
      const e = new Error('claude-cli exit ' + code + ': ' + err.slice(0, 300));
      e.code = 'AI_ERROR';
      reject(e);
    });
    child.stdin.on('error', () => {}); // EPIPE si el hijo muere pronto
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

module.exports = { runSubscription, available };
