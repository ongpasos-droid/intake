#!/usr/bin/env node
/**
 * Diagnóstico de charset del MySQL del VPS.
 *
 * Uso (en el VPS, dentro del contenedor app o con DB_HOST apuntando al MySQL):
 *   node scripts/diagnose_charset.js
 *
 * Solo LEE variables y conteos. No escribe nada.
 *
 * Hipótesis (a confirmar): el contenedor mysql `wordpress-eufunding-db-1` tiene
 * `init_connect = SET NAMES latin1` (default de algunas imágenes WordPress),
 * que sobreescribe el `SET NAMES utf8mb4` que envía mysql2 al conectar. Como
 * resultado todo INSERT desde la app inserta multibyte UTF-8 mal interpretado
 * y MySQL reemplaza los chars no representables por `?`.
 *
 * Si el output confirma esto, el fix definitivo es:
 *   1. Editar my.cnf del contenedor mysql:
 *        [mysqld]
 *        character-set-server = utf8mb4
 *        collation-server     = utf8mb4_unicode_ci
 *        init-connect         = ''
 *        skip-character-set-client-handshake = false
 *        [client]
 *        default-character-set = utf8mb4
 *   2. Reiniciar el contenedor mysql (NO tocar wordpress después, sus datos
 *      ya están almacenados en latin1 internamente y un re-encode rompería).
 *   3. Borrar filas corruptas de entities + entity_enrichment + ors_crawl_state.
 *   4. Volver a correr `node scripts/crawl_ors.js`.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

function bar(title) { console.log(`\n${'═'.repeat(70)}\n${title}\n${'═'.repeat(70)}`); }

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eplus_tools',
    charset: 'utf8mb4',
  });

  bar('1. Variables de charset del servidor');
  const [vars] = await conn.query(
    `SHOW VARIABLES WHERE Variable_name IN (
       'character_set_client','character_set_connection','character_set_database',
       'character_set_filesystem','character_set_results','character_set_server',
       'character_set_system','collation_connection','collation_database',
       'collation_server','init_connect'
     )`
  );
  for (const v of vars) {
    const flag = (v.Variable_name.startsWith('character_set_') && v.Value !== 'utf8mb4'
                  && v.Variable_name !== 'character_set_filesystem'
                  && v.Variable_name !== 'character_set_system')
                 || (v.Variable_name === 'init_connect' && /latin/i.test(v.Value || ''))
                 ? ' ⚠️ '
                 : '   ';
    console.log(`${flag}${v.Variable_name.padEnd(28)} = ${v.Value || '(empty)'}`);
  }

  bar('2. Charset de la base de datos actual');
  const [db] = await conn.query(
    `SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME
       FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = DATABASE()`
  );
  console.log(`   ${JSON.stringify(db[0])}`);

  bar('3. Charset de tablas y columnas clave');
  const tables = ['entities', 'entity_enrichment', 'organizations'];
  for (const t of tables) {
    const [info] = await conn.query(
      `SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [t]
    );
    if (!info.length) { console.log(`   ⊘ ${t}: tabla no existe`); continue; }
    console.log(`   ${t}.TABLE_COLLATION = ${info[0].TABLE_COLLATION}`);
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
          AND DATA_TYPE IN ('varchar','text','mediumtext','longtext','char')
        ORDER BY ORDINAL_POSITION LIMIT 8`, [t]
    );
    for (const c of cols) {
      const flag = c.CHARACTER_SET_NAME && c.CHARACTER_SET_NAME !== 'utf8mb4' ? ' ⚠️ ' : '   ';
      console.log(`${flag}  ${c.COLUMN_NAME.padEnd(24)} ${c.CHARACTER_SET_NAME || ''} / ${c.COLLATION_NAME || ''}`);
    }
  }

  bar('4. Conteo de filas con `??` (bytes 0x3F 0x3F)');
  const checks = [
    ['entities',          ['legal_name','city']],
    ['entity_enrichment', ['extracted_name','description']],
    ['organizations',     ['organization_name','address','city']],
  ];
  for (const [t, cols] of checks) {
    const [tt] = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [t]);
    if (!tt[0].n) { console.log(`   ⊘ ${t}: tabla no existe`); continue; }
    const where = cols.map(c => `\`${c}\` LIKE '%??%'`).join(' OR ');
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${t}\` WHERE ${where}`);
    const [[{ total }]] = await conn.query(`SELECT COUNT(*) AS total FROM \`${t}\``);
    const pct = total ? Math.round((n / total) * 100) : 0;
    const flag = n > 0 ? ' ⚠️ ' : '   ';
    console.log(`${flag}${t}: ${n}/${total} filas (${pct}%) con '??' en (${cols.join(', ')})`);
  }

  bar('5. Round-trip test: insertar y leer un char multibyte');
  // No escribimos en tablas reales: usamos una variable de sesión.
  // Si latin1 está fastidiando, el char volverá como '?'.
  const probe = 'Ñoño café año İstanbul Łódź';
  await conn.query('SET @probe = ?', [probe]);
  const [[{ readback }]] = await conn.query('SELECT @probe AS readback');
  const ok = readback === probe;
  console.log(`   Enviado : ${probe}`);
  console.log(`   Recibido: ${readback}`);
  console.log(`   Status  : ${ok ? '✅ OK — la conexión preserva UTF-8 multibyte' : '❌ ROTO — la conexión está convirtiendo (probable init_connect=latin1)'}`);

  bar('6. Diagnóstico');
  const charsetServer = vars.find(v => v.Variable_name === 'character_set_server')?.Value;
  const initConnect   = vars.find(v => v.Variable_name === 'init_connect')?.Value || '';
  if (!ok) {
    console.log('   ❌ La conexión NO preserva UTF-8 multibyte. Probable causa:');
    if (/latin/i.test(initConnect)) {
      console.log(`      → init_connect = "${initConnect}" sobreescribe el SET NAMES utf8mb4 de mysql2.`);
    }
    if (charsetServer && charsetServer !== 'utf8mb4') {
      console.log(`      → character_set_server = ${charsetServer} (debería ser utf8mb4).`);
    }
    console.log('   FIX: ver cabecera de este script (sección "Si el output confirma esto").');
  } else {
    console.log('   ✅ La conexión sí preserva UTF-8. La corrupción ya almacenada es histórica;');
    console.log('      arreglada la conexión, basta con re-crawl de las filas afectadas.');
  }

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
