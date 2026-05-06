#!/usr/bin/env node
/**
 * Limpieza de mojibake en BD: reemplaza secuencias `??` (que el crawler del VPS
 * dejó al insertar UTF-8 contra una conexión latin1) por cadena vacía en las
 * columnas de texto de `entities` y `entity_enrichment`.
 *
 * IRREVERSIBLE — los datos originales (chars multibyte) ya estaban perdidos
 * antes de este script. Lo único que hace es eliminar los `?` que quedaron
 * para que el display no parezca roto.
 *
 * Uso:
 *   node scripts/clean_mojibake_db.js --dry          # solo cuenta filas afectadas
 *   node scripts/clean_mojibake_db.js                # ejecuta el UPDATE real
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const dryRun = process.argv.includes('--dry');

const TARGETS = [
  { table: 'entities',          columns: ['legal_name','business_name','city'] },
  { table: 'entity_enrichment', columns: ['extracted_name','description','parent_organization','legal_form'] },
  { table: 'organizations',     columns: ['organization_name','legal_name_national','legal_name_latin','address','city','description','activities_experience'] },
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eplus_tools',
    charset: 'utf8mb4',
  });

  console.log(dryRun ? '— DRY RUN — sólo conteo, no se modifica nada\n' : '— LIMPIEZA — aplicando UPDATE\n');

  let totalAffected = 0;
  for (const { table, columns } of TARGETS) {
    // ¿Existe la tabla?
    const [t] = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [table]
    );
    if (!t[0].n) { console.log(`  ⊘ ${table} no existe (skip)`); continue; }

    for (const col of columns) {
      // ¿Existe la columna?
      const [c] = await conn.query(
        `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, col]
      );
      if (!c[0].n) continue;

      const [[{ affected }]] = await conn.query(
        `SELECT COUNT(*) AS affected FROM \`${table}\` WHERE \`${col}\` LIKE '%??%'`
      );
      if (!affected) { console.log(`  ⊘ ${table}.${col} sin corruption`); continue; }

      if (dryRun) {
        console.log(`  · ${table}.${col}: ${affected} filas con '??'`);
      } else {
        // REGEXP_REPLACE para colapsar 2+ '?' en cadena vacía
        await conn.query(
          `UPDATE \`${table}\` SET \`${col}\` = REGEXP_REPLACE(\`${col}\`, '\\\\?{2,}', '')
           WHERE \`${col}\` LIKE '%??%'`
        );
        console.log(`  ✓ ${table}.${col}: ${affected} filas limpiadas`);
      }
      totalAffected += affected;
    }
  }

  console.log(`\nTotal: ${totalAffected} filas con mojibake${dryRun ? ' (no modificadas)' : ' limpiadas'}`);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
