#!/bin/bash
# enrich-loop.sh — single iteration of the continuous enrichment loop.
# PM2 restarts this after each exit, so the script = one batch, then die.
#
# Tunables (env):
#   ENRICH_BATCH  rows per iteration (default 1000)
#   ENRICH_CONC   parallel fetches   (default 5)

set -euo pipefail
cd /opt/eplus-tools-dev

BATCH="${ENRICH_BATCH:-1000}"
CONC="${ENRICH_CONC:-5}"

echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) iteration START (batch=$BATCH conc=$CONC) ==="
/usr/bin/node scripts/enrich-batch.js \
  --input-mysql \
  --limit "$BATCH" \
  --concurrency "$CONC"
rc=$?
echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) iteration END (exit=$rc) ==="
# Small idle gap so PM2's min_uptime isn't tripped when a batch ends fast
# and so we don't hammer the DB with connection churn.
sleep 5
exit $rc
