import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

/**
 * Las credenciales llegan por env var, nunca por el repo.
 * GOOGLE_SERVICE_ACCOUNT_JSON acepta el JSON tal cual o el mismo JSON en base64
 * (Coolify se lleva peor con los saltos de línea de la clave privada).
 */
function loadCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_JSON: no hay credenciales de Google');
  }
  const texto = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8');
  let cred;
  try {
    cred = JSON.parse(texto);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no es JSON válido (ni directo ni en base64)');
  }
  if (!cred.client_email || !cred.private_key) {
    throw new Error('Las credenciales no traen client_email y private_key');
  }
  // Coolify y algunos paneles escapan los saltos de línea de la clave.
  cred.private_key = cred.private_key.replace(/\\n/g, '\n');
  return cred;
}

let clienteSheets = null;

export function sheetsClient() {
  if (!clienteSheets) {
    const cred = loadCredentials();
    const auth = new google.auth.JWT({
      email: cred.client_email,
      key: cred.private_key,
      scopes: SCOPES,
    });
    clienteSheets = google.sheets({ version: 'v4', auth });
  }
  return clienteSheets;
}

export function cuentaDeServicio() {
  return loadCredentials().client_email;
}

/** Traduce los errores de la API a algo accionable en el chat. */
export function explicarError(err) {
  const code = err?.code || err?.response?.status;
  const detalle = err?.errors?.[0]?.message || err?.response?.data?.error?.message || err?.message;
  if (code === 403) {
    return `Sin permiso (403). Comprueba que la hoja está compartida como editor con ${safeEmail()}. Detalle: ${detalle}`;
  }
  if (code === 404) {
    return `No encontrada (404). Revisa el spreadsheetId. Detalle: ${detalle}`;
  }
  if (code === 400) {
    return `Petición inválida (400). Suele ser un rango mal escrito o una pestaña que no existe. Detalle: ${detalle}`;
  }
  return `Error de la API de Sheets: ${detalle || err}`;
}

function safeEmail() {
  try {
    return cuentaDeServicio();
  } catch {
    return 'la cuenta de servicio';
  }
}
