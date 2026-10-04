#!/usr/bin/env bash
# Put www.admissionhands.com back on the old VPS after a cutover to Oracle.
#
#   ./scripts/rollback_oracle.sh          # preflight + rehearsal: changes nothing live
#   ./scripts/rollback_oracle.sh --go     # move back
#
# **The data comes back with it.** Everything written on Oracle since the
# cutover — leads, accounts, documents, uploads — is copied to the old box
# before the old app starts, because a rollback that silently drops the last
# day's enquiries is worse than staying put. Same discipline as the cutover:
# restored into a new database, compared table by table with writes stopped,
# swapped in by rename, the replaced copy kept.
#
# Order, so no write is ever lost and nothing is served from two databases:
#   1. the old box stops forwarding and shows the holding page;
#   2. Cloudflare points back at the old box — now everything sees the holding page;
#   3. the Oracle app stops, so nothing more is written there;
#   4. database and uploads are copied back and proven;
#   5. the old app starts.
# If anything fails between 1 and 5, the exit trap sends traffic back to Oracle,
# whose data was never modified.
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib/servers.sh

GO=0
for a in "$@"; do
  case "$a" in
    --go) GO=1 ;;
    *) die "unknown argument $a" ;;
  esac
done

STAMP="$(date -u +%Y%m%d_%H%M%S)"
WORK="${TMPDIR:-/tmp}/ah-rollback-$STAMP"
mkdir -p "$WORK"
BK=/var/backups/admissionhands-rollback

# Restore a dump already on the old box into database $2, owned by the app's
# role. pg_restore runs as the superuser but SET ROLEs to admissionhands, so
# every object belongs to the role the app connects as. The dump is fed on stdin
# because it sits in root's 0700 backup directory, which postgres cannot open.
old_restore_into() {
  local dump="$1" db="$2"
  old_ "set -e
    sudo -u postgres dropdb --if-exists --force $db
    sudo -u postgres createdb -O admissionhands $db
    sudo -u postgres pg_restore -d $db --no-owner --no-privileges --role=admissionhands --exit-on-error < $dump"
}
old_drop() { old_ "sudo -u postgres dropdb --if-exists --force $1"; }

preflight() {
  say "Preflight"
  local fwd app
  fwd=$(old_ 'systemctl is-active ah-forward' || true)
  app=$(old_ 'systemctl is-active admissionhands' || true)
  echo "  old box: forward=$fwd, old app=$app"
  if [[ $GO -eq 1 && "$fwd" != active ]]; then
    die "the old box is not forwarding — there is no cutover to roll back"
  fi
  local h; h=$(ora_ "docker inspect -f '{{.State.Health.Status}}' admissionhands-app-1 admissionhands-db-1 | tr '\n' ' '")
  [[ "$h" == "healthy healthy " ]] && ok "Oracle app and database healthy" || die "Oracle containers: $h"
  node scripts/cf_dns_origin.mjs --show && ok "Cloudflare token works" || die "Cloudflare API call failed"
  old_ "test -f /opt/admissionhands/maintenance.py" && ok "holding page installed on the old box" || die "maintenance.py missing on the old box"

  say "Rehearsal: restore Oracle's data on the old box into a scratch database"
  old_ "install -d -m 700 $BK"
  ora_ "docker exec admissionhands-db-1 sh -c 'pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Fc'" | old_ "cat > $BK/rehearsal.dump"
  ora_psql < "$COUNTS_SQL" > "$WORK/rehearsal_ora"
  # Not `restore && ok`: a failing command on the left of && does not trip set -e.
  old_restore_into "$BK/rehearsal.dump" ah_rehearsal
  ok "pg_restore --exit-on-error succeeded"
  old_psql ah_rehearsal < "$COUNTS_SQL" > "$WORK/rehearsal_old"
  local owners; owners=$(echo "select string_agg(distinct pg_get_userbyid(relowner), ',') from pg_class where relnamespace='public'::regnamespace" | old_psql ah_rehearsal)
  old_drop ah_rehearsal; old_ "rm -f $BK/rehearsal.dump"
  [[ "$owners" == admissionhands ]] && ok "every object owned by admissionhands" || die "objects owned by: $owners"
  diff -q <(cut -d' ' -f1 "$WORK/rehearsal_ora") <(cut -d' ' -f1 "$WORK/rehearsal_old") >/dev/null \
    && ok "same $(wc -l < "$WORK/rehearsal_old") tables and views" || die "the restored table list differs"
  local moved; moved=$(diff <(sort "$WORK/rehearsal_ora") <(sort "$WORK/rehearsal_old") | grep -c '^<' || true)
  ok "row counts: $(( $(wc -l < "$WORK/rehearsal_old") - moved )) identical, $moved moved by live writes during the rehearsal"
}

preflight
if [[ $GO -eq 0 ]]; then
  say "Preflight passed. Nothing was changed. Run with --go to move back."
  exit 0
fi

PHASE=start
on_exit() {
  local rc=$?
  [[ $rc -eq 0 ]] && return
  case "$PHASE" in
    hold|dns|data|uploads|app)
      printf '\n\033[31mRollback failed during "%s" — sending traffic back to Oracle, whose data was not touched.\033[0m\n' "$PHASE" >&2
      ora_ "$COMPOSE up -d app >/dev/null 2>&1" || true
      node scripts/cf_dns_origin.mjs "$ORA_IP" >&2 || true
      node scripts/cf_html_cache.mjs mumbai.admissionhands.com www.admissionhands.com >&2 || true
      old_ 'systemctl stop admissionhands 2>/dev/null; systemctl stop ah-maintenance 2>/dev/null; systemctl start ah-forward; systemctl is-active ah-forward' >&2 || true
      node scripts/cf_purge.mjs --everything >&2 || true
      echo "  The site is on Oracle again." >&2 ;;
  esac
}
trap on_exit EXIT

say "1/6  The old box stops forwarding and holds"
PHASE=hold
T0=$(date +%s)
old_ 'set -e; systemctl stop ah-forward
  systemd-run --quiet --unit=ah-maintenance --uid=admissionhands /usr/bin/python3 /opt/admissionhands/maintenance.py
  for i in $(seq 1 20); do c=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8120/ || true); [ "$c" = 503 ] && break; sleep 0.5; done
  [ "$c" = 503 ]'
ok "holding page up on the old box"

say "2/6  Cloudflare back to the old box"
PHASE=dns
node scripts/cf_dns_origin.mjs "$OLD_IP"
node scripts/cf_html_cache.mjs mumbai.admissionhands.com
node scripts/cf_purge.mjs --everything
sleep 15

say "3/6  Oracle app stops; copy its database back"
PHASE=data
ora_ "$COMPOSE stop app >/dev/null 2>&1"
old_ "install -d -m 700 $BK; sudo -u postgres pg_dump -Fc admissionhands > $BK/old-before-rollback-$STAMP.dump"
ok "the old box's own pre-rollback database saved to $BK/old-before-rollback-$STAMP.dump"
ora_ "docker exec admissionhands-db-1 sh -c 'pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Fc'" | old_ "cat > $BK/oracle-$STAMP.dump"
ora_psql < "$COUNTS_SQL" > "$WORK/ora_counts"
old_restore_into "$BK/oracle-$STAMP.dump" ah_incoming
old_psql ah_incoming < "$COUNTS_SQL" > "$WORK/old_counts"
if ! diff "$WORK/ora_counts" "$WORK/old_counts"; then
  old_drop ah_incoming
  die "the copy does not match Oracle table for table"
fi
ok "every table identical: $(grep -E '^(leads|users|student_documents) ' "$WORK/old_counts" | tr '\n' ' ')"
old_ "sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 -d postgres \
  -c 'ALTER DATABASE admissionhands RENAME TO admissionhands_before_rollback_$STAMP' \
  -c 'ALTER DATABASE ah_incoming RENAME TO admissionhands'"
ok "swapped in; the replaced copy is admissionhands_before_rollback_$STAMP"

say "4/6  Uploads back"
PHASE=uploads
ora_ "tar -C $APP -cf - uploads" | old_ "tar -C $APP -xf - && chown -R admissionhands:admissionhands $APP/uploads && chmod 700 $APP/uploads/documents"
missing=$(comm -23 \
  <(ora_ "cd $APP/uploads && find . -type f -exec md5sum {} + | sort") \
  <(old_ "cd $APP/uploads && find . -type f -exec md5sum {} + | sort") | wc -l)
[[ "$missing" -eq 0 ]] || die "$missing uploaded files did not arrive intact"
ok "every file on Oracle is on the old box"

say "5/6  Old app back"
PHASE=app
old_ 'set -e; systemctl stop ah-maintenance
  systemctl enable --quiet --now admissionhands
  systemctl disable --quiet ah-forward
  for i in $(seq 1 40); do c=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: www.admissionhands.com" http://127.0.0.1:8120/robots.txt || true); [ "$c" = 200 ] && break; sleep 0.5; done
  [ "$c" = 200 ]'
PHASE=done
ok "old app serving — downtime was $(( $(date +%s) - T0 ))s"
ora_ "$COMPOSE up -d app >/dev/null 2>&1" && ok "Oracle app started again for mumbai.admissionhands.com (its data now diverges)"

say "6/6  Verify"
BUILD=$(old_build)
via_cf=$(node --import ./scripts/lib/via_cloudflare.mjs -e "fetch('https://www.admissionhands.com/').then(r=>r.text()).then(t=>console.log(t.includes('$BUILD')?'old':'other'))")
[[ "$via_cf" == old ]] && ok "through Cloudflare, the old box's build answers" || echo "  ! through Cloudflare a different build answered — check before walking away"
node --import ./scripts/lib/via_cloudflare.mjs scripts/smoke.mjs https://www.admissionhands.com | tail -3

trap - EXIT
say "Rolled back. Deploy with ./scripts/deploy.sh again; the Oracle copy is untouched for a later retry."
