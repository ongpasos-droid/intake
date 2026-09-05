# MCP Sheets — servidor MCP para leer y escribir Google Sheets

Servidor MCP remoto que se añade a claude.ai como **conector personalizado**. Una vez conectado,
Claude puede leer y escribir celdas de las hojas de cálculo que le compartas, en cualquier
conversación, sin ejecutar scripts a mano.

Es un servicio independiente del backend de E+ Tools: su propio `package.json`, su propio
Dockerfile y su propio despliegue en Coolify. No toca `server.js` ni la base de datos.

## Herramientas que expone

| Herramienta | Qué hace |
|---|---|
| `sheets_whoami` | Devuelve el correo de la cuenta de servicio (el que hay que compartir en cada hoja) |
| `sheets_list_tabs` | Lista las pestañas de una hoja, con filas y columnas |
| `sheets_read_range` | Lee un rango en notación A1 |
| `sheets_write_range` | Sobrescribe un rango con los valores dados |
| `sheets_append_rows` | Añade filas al final de la tabla |
| `sheets_clear_range` | Vacía el contenido de un rango (destructiva) |

---

## Paso 1 — Cuenta de servicio en Google Cloud

Esta parte la tienes que hacer tú: implica tu cuenta de Google.

1. Entra en <https://console.cloud.google.com/> y crea un proyecto (por ejemplo `eplus-sheets`).
2. **APIs y servicios → Biblioteca** → busca *Google Sheets API* → **Habilitar**.
3. **APIs y servicios → Credenciales → Crear credenciales → Cuenta de servicio**.
   Nombre: `mcp-sheets`. Sin roles (no hacen falta: el permiso lo das compartiendo cada hoja).
4. Entra en la cuenta de servicio recién creada → pestaña **Claves** → **Agregar clave → Crear
   clave nueva → JSON**. Se descarga un fichero. **Ese fichero es la credencial: no lo subas
   nunca al repo.**
5. Abre el JSON y copia el valor de `client_email`. Tiene esta pinta:
   `mcp-sheets@eplus-sheets.iam.gserviceaccount.com`.

## Paso 2 — Compartir las hojas

Cada hoja que quieras que Claude pueda tocar, la compartes con ese correo **como editor**,
igual que se lo compartirías a una persona. Si no la compartes, el servidor no la ve: ese es
el mecanismo de seguridad, y es bueno que sea así.

## Paso 3 — Desplegar en Coolify

En Coolify, nueva aplicación desde este repositorio:

- **Base directory:** `mcp-sheets`
- **Build pack:** Dockerfile
- **Puerto:** `3100`
- **Dominio:** por ejemplo `mcp.eufundingschool.com` (con HTTPS; el certificado lo pone Coolify)

Variables de entorno:

| Variable | Valor |
|---|---|
| `MCP_SECRET` | Cadena aleatoria larga. Generar con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | El JSON de la cuenta de servicio. Si Coolify se atraganta con los saltos de línea, pásalo en base64: `base64 -w0 clave.json` |

Comprueba que arrancó bien: `https://TU-DOMINIO/health` debe responder `{"ok":true}`.

## Paso 4 — Añadir el conector en claude.ai

1. claude.ai → **Ajustes → Conectores → Añadir conector personalizado**.
2. URL: `https://TU-DOMINIO/s/EL_MCP_SECRET/mcp`
3. Guardar y habilitarlo en el chat donde lo quieras usar.

Comprueba que funciona pidiendo en el chat: *"lista las pestañas de la hoja `<ID>`"*.
El ID de una hoja es el tramo largo de su URL, entre `/d/` y `/edit`.

---

## Seguridad

**El secreto va dentro de la URL.** El diálogo de conectores personalizados de claude.ai solo
pide una dirección: no hay donde poner una cabecera de autenticación. Por eso la URL completa
*es* la credencial. Consecuencias prácticas:

- Trátala como una contraseña: no la pegues en el chat, ni en el repo, ni en un correo.
- Cualquiera que tenga esa URL puede escribir en las hojas que hayas compartido con la cuenta
  de servicio. En nada más: el alcance está limitado a esas hojas.
- Si se filtra, cambia `MCP_SECRET` en Coolify y actualiza el conector. La URL vieja deja de
  existir al instante.
- Las rutas con secreto incorrecto devuelven 404, no 401: desde fuera no se distingue de una
  URL que no existe.

Si en algún momento claude.ai admite cabeceras o OAuth en los conectores personalizados,
conviene migrar a eso y quitar el secreto de la ruta.

## Desarrollo en local

```sh
cd mcp-sheets
npm install
cp .env.example .env      # rellena MCP_SECRET y GOOGLE_SERVICE_ACCOUNT_JSON
node --env-file=.env src/server.js
```

Prueba rápida del handshake, sin necesidad de credenciales de Google:

```sh
curl -s -H 'Content-Type: application/json' \
     -H 'Accept: application/json, text/event-stream' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
     "http://localhost:3100/s/$MCP_SECRET/mcp"
```

## Notas de implementación

- Modo **sin estado**: un servidor y un transporte por petición. Así el conector sigue
  funcionando aunque Coolify reinicie el contenedor entre llamadas.
- `sheets_write_range` usa `USER_ENTERED` por defecto, así que Google interpreta fórmulas y
  fechas. Con `raw: true` escribe texto literal.
- Los errores 403 y 404 de la API se traducen a un mensaje que dice qué comprobar, porque la
  causa casi siempre es una hoja sin compartir o un ID mal copiado.
