# Shared by cutover_oracle.sh and rollback_oracle.sh. Sourced, not run.
#
# The two servers, and the one SQL used to prove a copy is complete.

OLD_KEY="${OLD_KEY:-D:/Gulshan/Keys/ServoRica_TradeOS}"
ORA_KEY="${ORACLE_KEY:-C:/Users/91971/.ssh/admissionhands_oracle}"
OLD_IP=38.49.209.165
ORA_IP=137.23.39.214
APP=/opt/admissionhands
COMPOSE="docker compose -p admissionhands -f $APP/compose.yml"

old_() { ssh -i "$OLD_KEY" -o BatchMode=yes -o ServerAliveInterval=20 "root@$OLD_IP" "$@"; }
ora_() { ssh -i "$ORA_KEY" -o BatchMode=yes -o ServerAliveInterval=20 "admissionhands@$ORA_IP" "$@"; }

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# psql on each side, reading SQL from stdin, unaligned output.
old_psql() { old_ "sudo -u postgres psql -X -q -At -v ON_ERROR_STOP=1 -d ${1:-admissionhands}"; }
ora_psql() { ora_ "docker exec -i admissionhands-db-1 sh -c 'psql -X -q -At -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d ${1:-\"\$POSTGRES_DB\"}'"; }

COUNTS_SQL="$(dirname "${BASH_SOURCE[0]}")/../sql/table_counts.sql"

# Which build answered: the BUILD_ID of the release that rendered this HTML.
ora_build() { ora_ "cat $APP/current/.next/BUILD_ID"; }
old_build() { old_ "cat $APP/current/.next/BUILD_ID"; }

# The WhatsApp gateway on Oracle must be paired before it is the only sender
# of OTPs and lead alerts.
ora_waha_status() {
  ora_ "set -a; . $APP/waha.env; set +a; curl -s -m 10 -H \"X-Api-Key: \$WAHA_API_KEY\" http://127.0.0.1:3001/api/sessions/default | jq -r '.status // \"unknown\"'"
}
