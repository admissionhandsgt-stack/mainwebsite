#!/usr/bin/env bash
# Move www.admissionhands.com from the old VPS to Oracle Cloud Mumbai.
#
#   ./scripts/cutover_oracle.sh                         # preflight + rehearsal: changes nothing live
#   ./scripts/cutover_oracle.sh --go                    # the move (asks nothing; run it when you mean it)
#   ./scripts/cutover_oracle.sh --go --allow-unpaired   # move even if Oracle's WhatsApp is not paired
#
# Undo with ./scripts/rollback_oracle.sh --go.
#
# ## What makes this safe
#
# 1. **Rehearsed first, every time.** Without --go it takes a real dump of the
#    live database, restores it on Oracle into a scratch database with the exact
#    command the move uses, compares every table, and drops it. --go runs that
#    preflight again before touching anything.
#
# 2. **Nothing is overwritten until it is proven.** The final copy is restored
#    into a new database beside the staging one and compared table by table
#    with the source — counted while writes are stopped, so the counts must be
#    identical. Only then are the two databases swapped by rename. The staging
#    copy stays as admissionhands_before_<stamp>.
#
# 3. **Any failure before traffic moves puts the old site back by itself.** The
#    old app is stopped, not removed; the exit trap restarts it.
#
# 4. **Traffic moves in one place, not through DNS.** The old box's app port is
#    taken over by an SSH forward to Oracle (deploy/oldbox/ah-forward.service).
#    Its Caddy and its WhatsApp gateway both talk to 127.0.0.1:8120, so from that
#    moment *everything* still reaching the old box — Cloudflare, a stale
#    resolver, an inbound WhatsApp webhook — lands on Oracle and the same
#    database. Only then are the Cloudflare records pointed at Oracle, which
#    merely removes a hop; if that step failed the site would still be up.
#    There is no 48-hour wait for resolvers and no window with two databases.
#
# Downtime is the holding page, for as long as dump + restore + compare take:
# about a minute. Pick a quiet hour (late night IST).
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/lib/servers.sh

GO=0; ALLOW_UNPAIRED=0
for a in "$@"; do
  case "$a" in
    --go) GO=1 ;;
    --allow-unpaired) ALLOW_UNPAIRED=1 ;;
    *) die "unknown argument $a" ;;
  esac
done

STAMP="$(date -u +%Y%m%d_%H%M%S)"
WORK="${TMPDIR:-/tmp}/ah-cutover-$STAMP"
mkdir -p "$WORK"

# Restore a dump already on Oracle into database $2, with the command the real
# move uses. Superuser in the container, so --no-owner leaves the app's own role
# owning everything.
ora_restore_into() {
  local dump="$1" db="$2"
  ora_ "set -e
    docker exec admissionhands-db-1 sh -c 'dropdb -U \"\$POSTGRES_USER\" --if-exists --force $db && createdb -U \"\$POSTGRES_USER\" $db'
    docker exec -i admissionhands-db-1 sh -c 'pg_restore -U \"\$POSTGRES_USER\" -d $db --no-owner --no-privileges --exit-on-error' < $dump"
}
ora_drop() { ora_ "docker exec admissionhands-db-1 sh -c 'dropdb -U \"\$POSTGRES_USER\" --if-exists --force $1'"; }

# ------------------------------------------------------------------ preflight
preflight() {
  say "Preflight"
  [[ "$(old_ 'systemctl is-active admissionhands' || true)" == active ]] && ok "old app is running" \
    || die "the old app is not running — is this already cut over? (systemctl status admissionhands on the old box)"
  old_ 'test -f /etc/systemd/system/ah-forward.service && test -f /opt/admissionhands/maintenance.py && test -f /root/.ssh/ah_forward' \
    && ok "forward unit, holding page and key are installed on the old box" \
    || die "deploy/oldbox files are not installed on the old box"
  [[ "$(old_ 'systemctl is-active ah-forward' || true)" != active ]] || die "ah-forward is already active"

  local h; h=$(ora_ "docker inspect -f '{{.State.Health.Status}}' admissionhands-app-1 admissionhands-db-1 | tr '\n' ' '")
  [[ "$h" == "healthy healthy " ]] && ok "Oracle app and database healthy" || die "Oracle containers: $h"

  local w; w=$(ora_waha_status)
  if [[ "$w" == WORKING ]]; then ok "Oracle WhatsApp gateway is paired (WORKING)"
  elif [[ $ALLOW_UNPAIRED -eq 1 ]]; then echo "  ! Oracle WhatsApp is $w — continuing (--allow-unpaired): OTPs fall back to the wa.me path, lead alerts will not send"
  else die "Oracle WhatsApp gateway is $w, not WORKING. Pair it first, or pass --allow-unpaired"
  fi

  node scripts/cf_dns_origin.mjs --show > "$WORK/dns_before" && ok "Cloudflare token works" || die "Cloudflare API call failed"
  sed 's/^/    /' "$WORK/dns_before"

  local free; free=$(ora_ "df -Pm $APP | awk 'NR==2{print \$4}'")
  (( free > 2048 )) && ok "Oracle has ${free} MB free" || die "Oracle has only ${free} MB free"

  # The forward path, on a spare port — the live 8120 is not touched.
  local code; code=$(old_ 'ssh -i /root/.ssh/ah_forward -o BatchMode=yes -o ExitOnForwardFailure=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/root/.ssh/ah_forward_known_hosts -N -L 127.0.0.1:8121:127.0.0.1:8150 admissionhands@137.23.39.214 & P=$!; sleep 3
    curl -s -o /dev/null -m 20 -w "%{http_code}" -H "Host: www.admissionhands.com" http://127.0.0.1:8121/robots.txt; kill $P 2>/dev/null; wait $P 2>/dev/null; true')
  [[ "$code" == 200 ]] && ok "old box -> Oracle forward answers 200" || die "forward test answered '$code'"

  say "Rehearsal: restore today's live data on Oracle into a scratch database"
  old_ "sudo -u postgres pg_dump -Fc admissionhands" \
    | ora_ "mkdir -p $APP/backups/cutover && cat > $APP/backups/cutover/rehearsal.dump"
  old_psql < "$COUNTS_SQL" > "$WORK/rehearsal_old"
  # Not `restore && ok`: a failing command on the left of && does not trip set -e.
  ora_restore_into "$APP/backups/cutover/rehearsal.dump" ah_rehearsal
  ok "pg_restore --exit-on-error succeeded"
  ora_psql ah_rehearsal < "$COUNTS_SQL" > "$WORK/rehearsal_new"
  ora_drop ah_rehearsal; ora_ "rm -f $APP/backups/cutover/rehearsal.dump"
  if diff -q <(cut -d' ' -f1 "$WORK/rehearsal_old") <(cut -d' ' -f1 "$WORK/rehearsal_new") >/dev/null; then
    ok "same $(wc -l < "$WORK/rehearsal_new") tables and views"
  else
    diff <(cut -d' ' -f1 "$WORK/rehearsal_old") <(cut -d' ' -f1 "$WORK/rehearsal_new") || true
    die "the restored table list differs"
  fi
  # The live site is still writing, so a lead may land between the dump and the
  # count. The real move stops writes first and must match exactly.
  local moved; moved=$(diff <(sort "$WORK/rehearsal_old") <(sort "$WORK/rehearsal_new") | grep -c '^<' || true)
  ok "row counts: $(( $(wc -l < "$WORK/rehearsal_new") - moved )) identical, $moved moved by live writes during the rehearsal"
}

preflight

if [[ $GO -eq 0 ]]; then
  say "Preflight passed. Nothing was changed. Run with --go to move."
  exit 0
fi

# ------------------------------------------------------------------ the move
PHASE=start
on_exit() {
  local rc=$?
  [[ $rc -eq 0 ]] && return
  case "$PHASE" in
    maintenance|data|uploads|app)
      printf '\n\033[31mFailed during "%s" — putting the old site back.\033[0m\n' "$PHASE" >&2
      old_ 'systemctl stop ah-maintenance 2>/dev/null || true; systemctl start admissionhands; sleep 2; systemctl is-active admissionhands' >&2 || true
      ora_ "$COMPOSE up -d app >/dev/null 2>&1" || true
      echo "  The old site is serving again from its own database; nothing was lost there." >&2
      echo "  Oracle's database may be half-swapped: re-run this script's preflight before trying again." >&2 ;;
    switched|verify)
      printf '\n\033[33mFailed after traffic moved (%s). The site is up on Oracle through the old box.\033[0m\n' "$PHASE" >&2
      echo "  Finish by hand: node scripts/cf_dns_origin.mjs $ORA_IP ; node scripts/cf_html_cache.mjs mumbai.admissionhands.com www.admissionhands.com ; node scripts/cf_purge.mjs --everything" >&2
      echo "  Or undo: ./scripts/rollback_oracle.sh --go" >&2 ;;
  esac
}
trap on_exit EXIT

say "1/7  Holding page on the old box — writes stop here"
PHASE=maintenance
T0=$(date +%s)
old_ 'set -e; systemctl stop admissionhands
  systemd-run --quiet --unit=ah-maintenance --uid=admissionhands /usr/bin/python3 /opt/admissionhands/maintenance.py
  for i in $(seq 1 20); do c=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8120/ || true); [ "$c" = 503 ] && break; sleep 0.5; done
  echo "  holding page answers $c"; [ "$c" = 503 ]'

say "2/7  Final copy of the database"
PHASE=data
DUMP="$APP/backups/cutover/old-$STAMP.dump"
old_ "sudo -u postgres pg_dump -Fc admissionhands" | ora_ "mkdir -p $APP/backups/cutover && cat > $DUMP"
old_psql < "$COUNTS_SQL" > "$WORK/old_counts"
ok "dumped ($(ora_ "du -h $DUMP | cut -f1")), $(wc -l < "$WORK/old_counts") tables counted with writes stopped"
ora_restore_into "$DUMP" ah_incoming
ora_psql ah_incoming < "$COUNTS_SQL" > "$WORK/new_counts"
if ! diff "$WORK/old_counts" "$WORK/new_counts"; then
  ora_drop ah_incoming
  die "the restored copy does not match the source table for table"
fi
ok "every table identical: $(grep -E '^(leads|users|student_documents|closing_ranks|seat_options) ' "$WORK/new_counts" | tr '\n' ' ')"

ora_ "$COMPOSE stop app >/dev/null 2>&1"
ora_ "docker exec admissionhands-db-1 sh -c 'psql -X -q -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d postgres \
  -c \"ALTER DATABASE \\\"\$POSTGRES_DB\\\" RENAME TO admissionhands_before_$STAMP\" \
  -c \"ALTER DATABASE ah_incoming RENAME TO \\\"\$POSTGRES_DB\\\"\"'"
ok "swapped in; the staging copy is kept as admissionhands_before_$STAMP"

say "3/7  Uploaded images and documents"
PHASE=uploads
old_ "tar -C $APP -cf - uploads" | ora_ "tar -C $APP -xf -"
missing=$(comm -23 \
  <(old_ "cd $APP/uploads && find . -type f -exec md5sum {} + | sort") \
  <(ora_ "cd $APP/uploads && find . -type f -exec md5sum {} + | sort") | wc -l)
[[ "$missing" -eq 0 ]] || die "$missing uploaded files did not arrive intact"
ora_ "chmod 700 $APP/uploads/documents 2>/dev/null; find $APP/uploads/images -type d -exec chmod 755 {} +; find $APP/uploads/images -type f -exec chmod 644 {} +"
ok "every file on the old box is on Oracle, checksum for checksum"

say "4/7  Oracle app up on the moved data"
PHASE=app
ora_ "set -e; $COMPOSE up -d app >/dev/null 2>&1
  for i in \$(seq 1 60); do s=\$(docker inspect -f '{{.State.Health.Status}}' admissionhands-app-1); [ \"\$s\" = healthy ] && break; sleep 2; done
  [ \"\$s\" = healthy ] || { docker logs --tail 30 admissionhands-app-1; exit 1; }
  c=\$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: www.admissionhands.com' http://127.0.0.1:8150/)
  echo \"  healthy, / answers \$c\"; [ \"\$c\" = 200 ]"

say "5/7  The old box forwards to Oracle — traffic moves here"
old_ 'set -e; systemctl stop ah-maintenance
  systemctl start ah-forward
  for i in $(seq 1 20); do c=$(curl -s -o /dev/null -w "%{http_code}" -H "Host: www.admissionhands.com" http://127.0.0.1:8120/robots.txt || true); [ "$c" = 200 ] && break; sleep 0.5; done
  [ "$c" = 200 ]
  systemctl enable --quiet ah-forward
  systemctl disable --quiet admissionhands'
PHASE=switched
ok "old box now forwards to Oracle — downtime was $(( $(date +%s) - T0 ))s"
ok "the old app is stopped and disabled, so a reboot of that box cannot bring it back"

say "6/7  Cloudflare: point the records at Oracle, cache, purge"
node scripts/cf_dns_origin.mjs "$ORA_IP"
node scripts/cf_html_cache.mjs mumbai.admissionhands.com www.admissionhands.com
node scripts/cf_purge.mjs --everything
sleep 10

say "7/7  Verify"
PHASE=verify
BUILD=$(ora_build)
via_cf=$(node --import ./scripts/lib/via_cloudflare.mjs -e "fetch('https://www.admissionhands.com/').then(r=>r.text()).then(t=>console.log(t.includes('$BUILD')?'oracle':'other'))")
[[ "$via_cf" == oracle ]] && ok "through Cloudflare, Oracle's build answers" || die "through Cloudflare a different build answered"
direct=$(curl -s -m 20 --resolve "www.admissionhands.com:443:$OLD_IP" https://www.admissionhands.com/ | grep -c "$BUILD" || true)
[[ "$direct" -ge 1 ]] && ok "straight to the old IP (a stale resolver), Oracle's build answers" || die "the old IP is not forwarding"
node --import ./scripts/lib/via_cloudflare.mjs scripts/smoke.mjs https://www.admissionhands.com | tail -3

trap - EXIT
say "Moved."
cat <<MSG
  Next:
    - DATABASE_URL in .env.local: tunnel to Oracle instead,
        ssh -i $ORA_KEY -N -L 55443:127.0.0.1:5442 admissionhands@$ORA_IP
      and set the port to 55443.
    - Deploy with ./scripts/deploy_oracle.sh from now on. scripts/deploy.sh targets the old box and refuses while it forwards.
    - Run verify_gate.mjs and verify_documents.mjs against www (via scripts/lib/via_cloudflare.mjs).
    - Leave the old box forwarding for 7 days, then: systemctl disable --now ah-forward there.
  Undo:  ./scripts/rollback_oracle.sh --go
MSG
