#!/usr/bin/env bash
# Make a data import show on the live site at once (2026-11-16, owner: "cache refresh karke instant reflect").
#
#   bash scripts/revalidate_tags.sh official-bond official-stipend          # the server's data caches
#   bash scripts/revalidate_tags.sh --purge official-bond                   # + Cloudflare's edge, every page
#
# 1. Asks the app, on the server, to drop the named unstable_cache tags (POST /api/cron/revalidate, the cron secret read
#    on the server — it never leaves the box). The next request reads the database.
# 2. --purge: clears Cloudflare's cache for the whole zone (scripts/cf_purge.mjs --everything), so even a page the edge
#    holds for hours is fetched fresh. Pages are re-rendered on demand; nothing else is touched.
set -euo pipefail
HOST="admissionhands@137.23.39.214"
KEY="${ORACLE_KEY:-C:/Users/91971/.ssh/admissionhands_oracle}"
PURGE=0
TAGS=()
for a in "$@"; do
  if [ "$a" = "--purge" ]; then PURGE=1
  elif [[ "$a" =~ ^[a-z][a-z-]*$ ]]; then TAGS+=("$a")
  else echo "not a tag: $a"; exit 1; fi
done
[ ${#TAGS[@]} -gt 0 ] || { echo "usage: $0 [--purge] <tag> [<tag>…]"; exit 1; }
JSON=$(printf '"%s",' "${TAGS[@]}"); JSON="{\"tags\":[${JSON%,}]}"
ssh -i "$KEY" -o BatchMode=yes "$HOST" \
  "curl -fsS -X POST -H \"x-cron-secret: \$(cat /opt/admissionhands/.cron-secret)\" -H 'content-type: application/json' -d '$JSON' http://127.0.0.1:8150/api/cron/revalidate"
echo
if [ "$PURGE" = 1 ]; then
  node --env-file=.env.local scripts/cf_purge.mjs --everything
fi
