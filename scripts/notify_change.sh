#!/usr/bin/env bash
# Tell Google and the IndexNow engines that pages changed — after an SQL file or a script changed what they show
# (2026-11-18, owner: "jaise bhi kuch update ho google notify hoke recrawl karle"). The app does this by itself for Zyn
# notices, MCC's results and added seats, and an admin edit of MCC's schedule; this is for changes made by hand.
#
#   bash scripts/notify_change.sh --schedule "Round 2 hold lifted"            # every page that prints MCC's dates
#   bash scripts/notify_change.sh /md-ms-india/bond /md-ms-india/stipend "bond import"
#   bash scripts/notify_change.sh --force --schedule "…"                       # resubmit the sitemap even inside 20 min
#
# It refreshes the sitemap cache (the pages' new lastmod, an exact IST time), sends IndexNow for the paths, and resubmits
# the sitemap to Google Search Console. The cron secret is read on the server and never leaves it. Run any
# `revalidate_tags.sh --purge` first, so the pages themselves are fresh when the crawlers come.
set -euo pipefail
HOST="admissionhands@137.23.39.214"
KEY="${ORACLE_KEY:-C:/Users/91971/.ssh/admissionhands_oracle}"
SCHEDULE=false; FORCE=false; PATHS=(); REASON="manual change"
for a in "$@"; do
  if [ "$a" = "--schedule" ]; then SCHEDULE=true
  elif [ "$a" = "--force" ]; then FORCE=true
  elif [[ "$a" =~ ^/[a-z0-9/-]*$ ]]; then PATHS+=("$a")
  else REASON="$a"; fi
done
[ "$SCHEDULE" = true ] || [ ${#PATHS[@]} -gt 0 ] || { echo "usage: $0 [--schedule] [--force] [/path …] [\"reason\"]"; exit 1; }
LIST=""; [ ${#PATHS[@]} -gt 0 ] && { LIST=$(printf '"%s",' "${PATHS[@]}"); LIST="${LIST%,}"; }
SAFE_REASON=$(printf '%s' "$REASON" | tr -cd 'A-Za-z0-9 .,:()_-' | cut -c1-120)
JSON="{\"paths\":[${LIST}],\"schedule\":${SCHEDULE},\"force\":${FORCE},\"reason\":\"${SAFE_REASON}\"}"
ssh -i "$KEY" -o BatchMode=yes "$HOST" \
  "curl -fsS -X POST -H \"x-cron-secret: \$(cat /opt/admissionhands/.cron-secret)\" -H 'content-type: application/json' -d '$JSON' http://127.0.0.1:8150/api/cron/notify"
echo
