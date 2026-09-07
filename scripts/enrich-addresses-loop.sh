#!/bin/bash
# enrich-addresses-loop.sh — single iteration of the deep-address re-extraction.
# PM2 restarts this after each exit, mirroring enrich-loop.sh.
#
# Tunables (env):
#   ADDR_BATCH        rows per iteration   (default 500)
#   ADDR_CONC         parallel fetches     (default 5)
#   ADDR_PRIORITY     "1" => prioritize DE/AT/CH/LU/LI (default 1)
#   ADDR_COUNTRIES    optional CSV filter  (e.g. "DE,AT")

set -uo pipefail
cd /opt/eplus-tools-dev

# Docker reasigna las IPs de los contenedores en cada reinicio del host, asi que
# la IP fija del .env queda obsoleta y el worker entra en bucle de reintentos.
# Resolvemos la IP en caliente; dotenv no pisa lo que ya viene en el entorno.
DB_HOST_LIVE="$(docker inspect \
  -f '{{(index .NetworkSettings.Networks "wordpress-eufunding_default").IPAddress}}' \
  wordpress-eufunding-db-1 2>/dev/null)"
if [ -n "$DB_HOST_LIVE" ]; then
  export DB_HOST="$DB_HOST_LIVE"
else
  echo "[addr-deep] no se pudo resolver la IP de wordpress-eufunding-db-1; espera 60s"
  sleep 60
  exit 1
fi

BATCH="${ADDR_BATCH:-500}"
CONC="${ADDR_CONC:-5}"
PRIORITY_FLAG=""
[ "${ADDR_PRIORITY:-1}" = "1" ] && PRIORITY_FLAG="--priority-de-at"

COUNTRY_FLAG=""
[ -n "${ADDR_COUNTRIES:-}" ] && COUNTRY_FLAG="--countries ${ADDR_COUNTRIES}"

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) addr-deep iteration START (batch=$BATCH conc=$CONC) ==="
/usr/bin/node scripts/enrich-addresses-deep.js \
  --batch "$BATCH" \
  --concurrency "$CONC" \
  $PRIORITY_FLAG \
  $COUNTRY_FLAG
rc=$?
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) addr-deep iteration END (exit=$rc) ==="
# Si la iteracion falla, esperar antes de devolver el control a PM2: sin esto el
# reinicio es inmediato y un fallo persistente se convierte en un bucle caliente.
if [ "$rc" -ne 0 ]; then
  sleep 60
else
  sleep 5
fi
exit $rc
