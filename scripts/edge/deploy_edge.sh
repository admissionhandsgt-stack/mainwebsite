#!/usr/bin/env bash
# Deploy the in-country edge: a Cloudflare Pages project (advanced mode) that is
# www.admissionhands.com. See deploy/edge/_worker.js for why it exists.
#
#   ./scripts/edge/deploy_edge.sh [release dir on the server]   (default: current)
#
# deploy_oracle.sh runs this BEFORE switching to a new release, so the new
# build's _next/static is already at the edge when the origin starts linking to
# it. The release carries the previous build's static files for a week, so a
# page rendered a moment before the switch still finds its scripts.
#
# Needs in .env.local: CLOUDFLARE_PAGES_TOKEN (Account → Cloudflare Pages: Edit)
# and CLOUDFLARE_ACCOUNT_ID. The zone token (CLOUDFLARE_API_TOKEN) cannot do this.
set -euo pipefail
cd "$(dirname "$0")/../.."

PROJECT=admissionhands-edge
HOST="admissionhands@137.23.39.214"
KEY="${ORACLE_KEY:-C:/Users/91971/.ssh/admissionhands_oracle}"
REL="${1:-/opt/admissionhands/current}"

envget() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | tr -d '\r'; }
export CLOUDFLARE_API_TOKEN="$(envget CLOUDFLARE_PAGES_TOKEN)"
export CLOUDFLARE_ACCOUNT_ID="$(envget CLOUDFLARE_ACCOUNT_ID)"
[[ -n "$CLOUDFLARE_API_TOKEN" && -n "$CLOUDFLARE_ACCOUNT_ID" ]] || {
  echo "  CLOUDFLARE_PAGES_TOKEN / CLOUDFLARE_ACCOUNT_ID missing in .env.local" >&2
  exit 1
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
SITE="$WORK/site"
mkdir -p "$SITE/_next"

echo "  fetching static files from $REL"
ssh -i "$KEY" -o BatchMode=yes "$HOST" \
  "cd '$REL' && tar --exclude=public/assets/images/uploads -czf - .next/static public" | tar -C "$WORK" -xzf -
mv "$WORK/.next/static" "$SITE/_next/static"
cp -a "$WORK/public/." "$SITE/"
rm -rf "$SITE/assets/images/uploads"
cp deploy/edge/_worker.js "$SITE/_worker.js"
node scripts/edge/routes.mjs "$SITE"
echo "  $(find "$SITE" -type f | wc -l) files"

npx --no-install wrangler pages deploy "$SITE" --project-name "$PROJECT" --branch main --commit-dirty=true 2>&1 |
  grep -vE "^\s*$|Uploading|✨ Compiled" | tail -6
