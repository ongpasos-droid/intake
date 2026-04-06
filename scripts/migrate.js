/**
 * Simple migration runner.
 * Reads SQL files from /migrations in order and executes them.
 * Usage: node scripts/migrate.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eplus_tools',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') || f.endsWith('.js'))
    .sort();

  console.log(`Found ${files.length} migration(s):`);

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(`  Running ${file}...`);
    try {
      if (file.endsWith('.js')) {
        const migrationFn = require(filePath);
        await migrationFn(conn);
      } else {
        const sql = fs.readFileSync(filePath, 'utf8');
        await conn.query(sql);
      }
      console.log(`  ✓ ${file} done`);
    } catch (err) {
      // Tolerate "already exists" and "duplicate entry" errors — migrations are re-run on every deploy
      if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_ENTRY' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_FIELDNAME') {
        console.log(`  ⊘ ${file} skipped (already applied): ${err.message}`);
      } else {
        console.error(`  ✗ ${file} failed:`, err.message);
        process.exit(1);
      }
    }
  }

  console.log('All migrations complete.');
  await conn.end();
}

run().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
