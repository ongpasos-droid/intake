#!/bin/bash
# enrich-status.sh — snapshot of the enrichment pipeline.
# Invoked by cron every 2h; output appended to /var/log/enrich-batch/status.log
# AND pushed to Oscar's Telegram (chat_id from telegram-bot-claude27/.env).
# Safe to invoke manually any time.

set -euo pipefail
cd /opt/eplus-tools-dev

TMP_OUT=$(mktemp)
trap 'rm -f "$TMP_OUT"' EXIT

/usr/bin/node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST, port: +process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  const ts = new Date().toISOString().replace(/\.\d+Z\$/, 'Z');
  console.log('');
  console.log('============================================================');
  console.log(' ENRICH 24/7 STATUS — ' + ts);
  console.log('============================================================');

  const [[tot]] = await c.query(
    'SELECT COUNT(*) n FROM entity_enrichment'
  );
  const [[target]] = await c.query(
    \"SELECT COUNT(*) n FROM entities WHERE website IS NOT NULL AND website <> '' AND website REGEXP '^https?://'\"
  );
  const pct = target.n > 0 ? (100 * tot.n / target.n).toFixed(2) : '0';
  console.log('Procesadas:          ' + tot.n + ' / ' + target.n + '  (' + pct + '%)');

  const [last1h] = await c.query(
    \"SELECT COUNT(*) n FROM entity_enrichment WHERE last_fetched_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)\"
  );
  const [last2h] = await c.query(
    \"SELECT COUNT(*) n FROM entity_enrichment WHERE last_fetched_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)\"
  );
  console.log('Última hora:         ' + last1h[0].n);
  console.log('Últimas 2h:          ' + last2h[0].n);

  const remaining = target.n - tot.n;
  const rate1h = last1h[0].n;
  if (rate1h > 0) {
    const eta = Math.round(remaining / rate1h);
    console.log('ETA primera pasada:  ~' + eta + ' h al ritmo actual');
  }

  console.log('');
  console.log('Breakdown errores (total acumulado):');
  const [errs] = await c.query(
    \"SELECT COALESCE(error_type, '(ok)') t, COUNT(*) n FROM entity_enrichment GROUP BY t ORDER BY n DESC\"
  );
  errs.forEach(r => console.log('  ' + String(r.t).padEnd(15) + ' ' + r.n));

  console.log('');
  console.log('Cobertura sobre OK:');
  const [[cov]] = await c.query(
    \`SELECT
        SUM(JSON_LENGTH(emails)     > 0) AS emails,
        SUM(JSON_LENGTH(phones)     > 0) AS phones,
        SUM(JSON_LENGTH(addresses)  > 0) AS addresses,
        SUM(JSON_LENGTH(social_links) > 0) AS social,
        SUM(description IS NOT NULL AND description <> '') AS descr,
        SUM(logo_url IS NOT NULL) AS logo,
        COUNT(*) AS ok
      FROM entity_enrichment WHERE error_type IS NULL\`
  );
  const ok = Number(cov.ok || 0);
  const p = v => ok > 0 ? (100 * Number(v) / ok).toFixed(1) + '%' : '-';
  console.log('  emails      ' + String(cov.emails).padStart(6) + '  (' + p(cov.emails) + ')');
  console.log('  phones      ' + String(cov.phones).padStart(6) + '  (' + p(cov.phones) + ')');
  console.log('  addresses   ' + String(cov.addresses).padStart(6) + '  (' + p(cov.addresses) + ')');
  console.log('  social_links' + String(cov.social).padStart(6) + '  (' + p(cov.social) + ')');
  console.log('  description ' + String(cov.descr).padStart(6) + '  (' + p(cov.descr) + ')');
  console.log('  logo        ' + String(cov.logo).padStart(6) + '  (' + p(cov.logo) + ')');

  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
" | tee "$TMP_OUT"

# ── Push snapshot to Telegram ────────────────────────────────────────
# Credentials come from the telegram-bot-claude27 project already running
# on this VPS. We intentionally source only the two vars we need.
set -a
# shellcheck disable=SC1091
source <(grep -E '^(TELEGRAM_BOT_TOKEN|TELEGRAM_USER_ID)=' /opt/telegram-bot-claude27/.env)
set +a

if [[ -n "${TELEGRAM_BOT_TOKEN:-}" && -n "${TELEGRAM_USER_ID:-}" ]]; then
  # Telegram caps messages at 4096 chars — our snapshot is <1500.
  MSG=$(cat "$TMP_OUT")
  curl -s -o /dev/null \
    -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_USER_ID}" \
    --data-urlencode "text=${MSG}" \
    --data-urlencode "disable_notification=true" \
    || echo "[warn] telegram push failed" >&2
fi
