/* ── VPS Analytics Module — model (read-only Postgres pool) ─── */
const { Pool } = require('pg');

// En el contenedor de Coolify resuelve `erasmus-pg` por DNS de la red docker
// (la red `coolify` debe contener al servicio erasmus-pg).
// En local/host, exportar PG_ANALYTICS_URL=postgresql://erasmus:erasmus@127.0.0.1:5433/erasmus
const ANALYTICS_URL = process.env.PG_ANALYTICS_URL
  || 'postgresql://erasmus:erasmus@erasmus-pg:5432/erasmus';

const pool = new Pool({
  connectionString: ANALYTICS_URL,
  max: 6,
  idleTimeoutMillis: 30_000,
  statement_timeout: 30_000
});

pool.on('error', (err) => {
  console.error('[vps/model] pg pool error', err.message);
});

async function query(sql, params = []) {
  const t0 = Date.now();
  const r = await pool.query(sql, params);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[vps/sql] ${(Date.now()-t0)}ms rows=${r.rowCount}`);
  }
  return r.rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = { query, queryOne, pool };
