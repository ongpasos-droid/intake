import { z } from 'zod';
import { sheetsClient, cuentaDeServicio, explicarError } from './sheets.js';

const texto = (t) => ({ content: [{ type: 'text', text: t }] });
const error = (t) => ({ content: [{ type: 'text', text: t }], isError: true });

const idHoja = z.string().describe(
  'ID de la hoja de cálculo: el tramo largo de la URL entre /d/ y /edit'
);
const rango = z.string().describe(
  "Rango en notación A1, con pestaña delante: 'fundesign!C2:C210'. Si la pestaña lleva espacios, entre comillas simples."
);
const valores = z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).describe(
  'Filas de celdas, una lista por fila. Ej: [["a","b"],["c","d"]]'
);

export function registrarHerramientas(server) {
  server.registerTool(
    'sheets_list_tabs',
    {
      title: 'Listar pestañas',
      description:
        'Devuelve las pestañas de una hoja de cálculo con su nombre, id, número de filas y de columnas. ' +
        'Úsalo antes de escribir para confirmar el nombre exacto de la pestaña.',
      inputSchema: { spreadsheetId: idHoja },
    },
    async ({ spreadsheetId }) => {
      try {
        const { data } = await sheetsClient().spreadsheets.get({
          spreadsheetId,
          fields: 'properties.title,sheets.properties',
        });
        const pestanas = data.sheets.map((s) => ({
          titulo: s.properties.title,
          sheetId: s.properties.sheetId,
          filas: s.properties.gridProperties?.rowCount,
          columnas: s.properties.gridProperties?.columnCount,
        }));
        return texto(JSON.stringify({ documento: data.properties.title, pestanas }, null, 2));
      } catch (err) {
        return error(explicarError(err));
      }
    }
  );

  server.registerTool(
    'sheets_read_range',
    {
      title: 'Leer rango',
      description: 'Lee las celdas de un rango y las devuelve como matriz de filas.',
      inputSchema: {
        spreadsheetId: idHoja,
        range: rango,
        valueRenderOption: z
          .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
          .optional()
          .describe('FORMULA devuelve la fórmula en vez del resultado. Por defecto FORMATTED_VALUE.'),
      },
    },
    async ({ spreadsheetId, range, valueRenderOption }) => {
      try {
        const { data } = await sheetsClient().spreadsheets.values.get({
          spreadsheetId,
          range,
          valueRenderOption,
        });
        return texto(JSON.stringify({ range: data.range, values: data.values || [] }, null, 2));
      } catch (err) {
        return error(explicarError(err));
      }
    }
  );

  server.registerTool(
    'sheets_write_range',
    {
      title: 'Escribir rango',
      description:
        'Sobrescribe las celdas de un rango con los valores dados. Escribe exactamente las filas que le pases: ' +
        'no borra lo que quede por debajo del rango. Para vaciar celdas usa sheets_clear_range.',
      inputSchema: {
        spreadsheetId: idHoja,
        range: rango,
        values: valores,
        raw: z
          .boolean()
          .optional()
          .describe(
            'true escribe el texto literal (una fórmula quedaría como texto). ' +
              'Por defecto false: Google interpreta fórmulas, fechas y números.'
          ),
      },
    },
    async ({ spreadsheetId, range, values, raw }) => {
      try {
        const { data } = await sheetsClient().spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: raw ? 'RAW' : 'USER_ENTERED',
          requestBody: { values },
        });
        return texto(
          `Escrito en ${data.updatedRange}: ${data.updatedRows} filas, ${data.updatedCells} celdas.`
        );
      } catch (err) {
        return error(explicarError(err));
      }
    }
  );

  server.registerTool(
    'sheets_append_rows',
    {
      title: 'Añadir filas',
      description:
        'Añade filas al final de la tabla, después de la última fila con datos del rango indicado. ' +
        'No sobrescribe nada.',
      inputSchema: {
        spreadsheetId: idHoja,
        range: rango,
        values: valores,
        raw: z.boolean().optional(),
      },
    },
    async ({ spreadsheetId, range, values, raw }) => {
      try {
        const { data } = await sheetsClient().spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: raw ? 'RAW' : 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values },
        });
        return texto(`Añadidas ${values.length} filas en ${data.updates?.updatedRange}.`);
      } catch (err) {
        return error(explicarError(err));
      }
    }
  );

  server.registerTool(
    'sheets_clear_range',
    {
      title: 'Vaciar rango',
      description:
        'Borra el contenido de las celdas de un rango (mantiene el formato y no elimina filas). ' +
        'Operación destructiva: confirma con la persona antes de usarla sobre datos que no has escrito tú.',
      inputSchema: { spreadsheetId: idHoja, range: rango },
    },
    async ({ spreadsheetId, range }) => {
      try {
        const { data } = await sheetsClient().spreadsheets.values.clear({ spreadsheetId, range });
        return texto(`Vaciado ${data.clearedRange}.`);
      } catch (err) {
        return error(explicarError(err));
      }
    }
  );

  server.registerTool(
    'sheets_whoami',
    {
      title: 'Cuenta de servicio',
      description:
        'Devuelve el correo de la cuenta de servicio con la que este servidor accede a Google. ' +
        'Ese correo es el que hay que añadir como editor en cada hoja que se quiera tocar.',
      inputSchema: {},
    },
    async () => {
      try {
        return texto(cuentaDeServicio());
      } catch (err) {
        return error(String(err.message || err));
      }
    }
  );
}
