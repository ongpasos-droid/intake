import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registrarHerramientas } from './tools.js';

const PORT = process.env.PORT || 3100;
const SECRET = process.env.MCP_SECRET;

if (!SECRET || SECRET.length < 24) {
  console.error('MCP_SECRET no definido o demasiado corto (mínimo 24 caracteres).');
  console.error('Genera uno con:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4mb' }));

// Sonda de salud sin secreto, para Coolify.
app.get('/health', (_req, res) => res.json({ ok: true }));

/**
 * El secreto va en la ruta porque el diálogo de conectores personalizados de
 * claude.ai solo pide una URL: no hay donde meter una cabecera. La URL completa
 * es, por tanto, la credencial — trátala como una contraseña.
 */
function comprobarSecreto(req, res, next) {
  const recibido = req.params.secret || '';
  if (recibido.length !== SECRET.length || !timingSafeEqual(recibido, SECRET)) {
    return res.status(404).end();
  }
  next();
}

function timingSafeEqual(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Modo sin estado: un servidor y un transporte por petición. Es lo más simple y
 * lo que mejor aguanta que Coolify reinicie el contenedor entre llamadas.
 */
async function atender(req, res) {
  const server = new McpServer(
    { name: 'eplus-sheets', version: '0.1.0' },
    {
      instructions:
        'Herramientas de lectura y escritura sobre Google Sheets. Antes de escribir, ' +
        'usa sheets_list_tabs para confirmar el nombre exacto de la pestaña, y sheets_read_range ' +
        'para ver qué hay en el rango. sheets_clear_range es destructiva.',
    }
  );
  registrarHerramientas(server);

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('Error atendiendo la petición MCP:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Error interno del servidor' },
        id: null,
      });
    }
  }
}

app.post('/s/:secret/mcp', comprobarSecreto, atender);

// En modo sin estado no hay flujo SSE que mantener abierto ni sesión que cerrar.
app.get('/s/:secret/mcp', comprobarSecreto, (_req, res) => res.status(405).end());
app.delete('/s/:secret/mcp', comprobarSecreto, (_req, res) => res.status(405).end());

app.listen(PORT, () => {
  console.log(`MCP Sheets escuchando en el puerto ${PORT}`);
  console.log(`Ruta: /s/<MCP_SECRET>/mcp`);
});
