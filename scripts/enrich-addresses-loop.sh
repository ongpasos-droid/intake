#!/bin/bash
# enrich-addresses-loop.sh — single iteration of the deep-address re-extraction.
# PM2 restarts this after each exit, mirroring enrich-loop.sh.
#
# Tunables (env):
#   ADDR_BATCH        rows per iteration   (default 500)
#   ADDR_CONC         parallel fetches     (default 5)
#   ADDR_PRIORITY     "1" => prioritize DE/AT/CH/LU/LI (default 1)
#   ADDR_COUNTRIES    optional CSV filter  (e.g. "DE,AT")

set -euo pipefail
cd /opt/eplus-tools-dev

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
sleep 5
exit $rc
