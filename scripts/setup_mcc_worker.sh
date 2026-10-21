#!/usr/bin/env bash
# Installs or updates the mcc-worker container on the Oracle server (2026-10-21).
#
#   bash scripts/setup_mcc_worker.sh            # role, env file, compose service, build, start
#   bash scripts/setup_mcc_worker.sh --check    # what is running, and the worker's last log lines
#
# Deploy the app first: the worker calls its /api/cron/mcc-results route when a result appears.
# The database password is generated on the server and written only into
# /opt/admissionhands/mcc-worker.env (mode 600) — it is never printed, and never leaves the box.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib/servers.sh

if [[ "${1:-}" == "--check" ]]; then
  ora_ "$COMPOSE ps mcc-worker; echo; docker logs --tail 20 admissionhands-mcc-worker-1 2>&1"
  exit 0
fi

say "Database role"
ora_psql < scripts/sql/mcc_worker_role.sql
ok "mcc_worker can write its three tables and read two"

say "Env file"
ora_ 'set -euo pipefail
  F=/opt/admissionhands/mcc-worker.env
  if [ -s "$F" ]; then echo "  kept the existing $F"; exit 0; fi
  set -a; . /opt/admissionhands/db.env; set +a
  PW=$(openssl rand -hex 24)
  # The password reaches psql on stdin, never as an argument other users could see.
  printf "ALTER ROLE mcc_worker PASSWORD %s;\n" "'"'"'$PW'"'"'" \
    | docker exec -i admissionhands-db-1 sh -c "psql -X -q -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\""
  umask 077
  { echo "DATABASE_URL=postgres://mcc_worker:$PW@db:5432/$POSTGRES_DB"
    echo "CRON_SECRET=$(cat /opt/admissionhands/.cron-secret)"; } > "$F"
  echo "  wrote $F ($(stat -c %a "$F"))"'

say "Compose service and image"
ora_ "cp $APP/compose.yml $APP/compose.yml.bak-$(date +%Y%m%d-%H%M%S)"
tar -C deploy/oracle -czf - compose.yml mcc-worker/Dockerfile mcc-worker/requirements.txt mcc-worker/worker.py mcc-worker/.dockerignore \
  | ora_ "tar -C $APP -xzf -"
ora_ "set -e; cd $APP; $COMPOSE config --quiet && $COMPOSE build mcc-worker 2>&1 | tail -3 && $COMPOSE up -d --no-deps mcc-worker 2>&1 | tail -2"
ok "mcc-worker built and started"
ora_ "sleep 8; $COMPOSE ps mcc-worker; docker logs --tail 5 admissionhands-mcc-worker-1 2>&1"
