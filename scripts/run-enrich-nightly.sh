#!/bin/bash
# run-enrich-nightly.sh — cron entry point for the ORS enrichment batch.
# Invoked by /etc/crontab (root) at 02:00 UTC daily.
#
# Behaviour:
#   - Processes up to ENRICH_LIMIT (default 10000) entities with unfetched or
#     stale enrichment (>30 days old, per enrich-batch.js default).
#   - Safe to re-run: already-fetched rows are skipped via the LEFT JOIN.
#   - Logs to /var/log/enrich-batch/enrich-YYYYMMDD.log (one file per night).
#
# Tunables via environment:
#   ENRICH_LIMIT  max rows processed per run          (default 10000)
#   ENRICH_CONC   parallel fetches                    (default 5)
#
# Quick check from shell:
#   tail -f /var/log/enrich-batch/enrich-$(date +%Y%m%d).log

set -euo pipefail

cd /opt/eplus-tools-dev

LIMIT="${ENRICH_LIMIT:-10000}"
CONC="${ENRICH_CONC:-5}"

LOG_DIR=/var/log/enrich-batch
mkdir -p "$LOG_DIR"
LOGFILE="$LOG_DIR/enrich-$(date -u +%Y%m%d).log"

{
  echo
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) START (limit=$LIMIT conc=$CONC) ==="
  /usr/bin/node scripts/enrich-batch.js \
    --input-mysql \
    --limit "$LIMIT" \
    --concurrency "$CONC"
  rc=$?
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) END  (exit=$rc) ==="
} >> "$LOGFILE" 2>&1
