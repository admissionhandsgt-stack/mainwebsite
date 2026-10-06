#!/usr/bin/env bash
# Deploy to the Oracle Cloud Mumbai server (137.23.39.214, ARM64).
#
#   ./scripts/deploy_oracle.sh            # ship the working tree, build there, switch
#   ./scripts/deploy_oracle.sh --no-switch  # build and stage a release, leave the live one running
#
# ## Why the build happens on the server
#
# The box is ARM64. A release built on this Windows machine carries
# @img/sharp-win32-x64 and @next/swc-win32-x64, and neither loads on Linux ARM —
# the old x86 box needed hand-linked sharp binaries for exactly that reason. So
# the source goes over, and `npm ci` + `next build` run in a node:22 container
# on the server, where every native package resolves for linux-arm64.
#
# The build container joins the compose network so it can reach the database
# as db:5432. That matters: pages pre-rendered at build time read Postgres, and
# a build that cannot reach it does not fail — safe() swallows the error and
# bakes an empty section into a page that is then cached.
#
# ## Rules this script keeps, because the box is shared
#
# - compose is only ever run with `-p admissionhands`;
# - the one-off build container is named admissionhands-build and removed after;
# - nothing is pruned.
set -euo pipefail

HOST="admissionhands@137.23.39.214"
KEY="${ORACLE_KEY:-C:/Users/91971/.ssh/admissionhands_oracle}"
APP=/opt/admissionhands
STAMP="$(date -u +%Y%m%d-%H%M%S)"
SWITCH=1
[[ "${1:-}" == "--no-switch" ]] && SWITCH=0

ssh_() { ssh -i "$KEY" -o BatchMode=yes -o ServerAliveInterval=20 "$HOST" "$@"; }
say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

cd "$(dirname "$0")/.."

# ------------------------------------------------------------------ source
say "Sending source"
# Tracked files plus untracked-but-not-ignored ones: the working tree as git
# sees it. .env.local and other ignored files never leave this machine.
git ls-files -co --exclude-standard -z \
  | tar --null -T - -czf - \
  | ssh_ "set -e; rm -rf $APP/src.new && mkdir -p $APP/src.new && tar -C $APP/src.new -xzf - \
          && if [ -d $APP/src/node_modules ]; then mv $APP/src/node_modules $APP/src.new/; fi \
          && rm -rf $APP/src && mv $APP/src.new $APP/src && echo '  source in place'"

# ------------------------------------------------------------------ build
say "Building on the server (ARM64)"
# The whole log goes to a file and the exit status is checked explicitly. The
# first version piped the build through `tail`, which made the pipeline's
# status tail's — a failed `npm ci` reported success and the script went on to
# assemble a release out of nothing.
#
# Retried — up to three tries — only when the failure is next/font's, never for
# anything else. Next 14's Google-font loader assumes every font URL ends in
# .woff2 and throws "Cannot read properties of null (reading '1')" when Google
# occasionally answers with one that does not; two of four builds failed that
# way on 2026-10-06 while the same request moments later was fine. It is
# Google's response, not our code, so a retry is the honest fix. (Self-hosting
# the font files with next/font/local would remove the dependency entirely.)
ssh_ "set -e; docker rm -f admissionhands-build >/dev/null 2>&1 || true
  for try in 1 2 3; do
    if docker run --rm --name admissionhands-build \
        --network admissionhands_default \
        --user 1003:1003 --memory 4g \
        --env-file $APP/.env -e HOME=/tmp -e NEXT_TELEMETRY_DISABLED=1 \
        -v $APP/src:/src -w /src node:22-bookworm \
        sh -c 'NODE_ENV=development npm ci --no-audit --no-fund --loglevel=error \
               && NODE_ENV=production npm run build' > $APP/src/build.log 2>&1; then
      break
    fi
    if [ \$try -lt 3 ] && grep -q 'An error occurred in .next/font' $APP/src/build.log; then
      echo \"  next/font could not read Google's response (try \$try) — building again\"; sleep 10; continue
    fi
    echo '  BUILD FAILED — last lines:'; tail -30 $APP/src/build.log; exit 1
  done
  grep -E 'Compiled|Generating static pages \(|Failed query' $APP/src/build.log | tail -6"

# A build that could not reach the database still exits 0 — the failures are
# only in its log. Refuse to ship it.
if ssh_ "grep -q 'Failed query' $APP/src/build.log"; then
  echo "The build logged failed database queries — pages may be baked empty. Not shipping." >&2
  exit 1
fi

# ------------------------------------------------------------------ release
say "Assembling release $STAMP"
ssh_ "set -e; R=$APP/releases/$STAMP; mkdir -p \$R
  cp -a $APP/src/.next/standalone/. \$R/
  mkdir -p \$R/.next && cp -a $APP/src/.next/static \$R/.next/static
  # The previous build's chunks too. Cloudflare holds logged-out HTML for five
  # minutes and a visitor may have a tab open for longer; either way a page from
  # the old build asks for the old build's hashed JS, and without these it gets
  # a 404 and a page that never hydrates. Names are content hashes, so
  # no-clobber is exact. Carried files keep their own build time, so anything
  # over a week old is dropped and the directory does not grow forever.
  if [ -d $APP/current/.next/static ]; then
    cp -a --update=none $APP/current/.next/static/. \$R/.next/static/
    find \$R/.next/static -type f -mtime +7 -delete
  fi
  # Into, not onto. The standalone output already has a public/ (the uploads
  # route makes Next trace public/assets/images/uploads into it), so
  # 'cp -a src/public \$R/public' nested the real one at public/public, and
  # every logo, favicon and hero image answered 404 from 2026-10-04 to 10-06.
  mkdir -p \$R/public && cp -a $APP/src/public/. \$R/public/
  test -f \$R/public/favicon.ico && test -f \$R/public/assets/images/logos/logo.avif \
    || { echo '  public/ did not land in the release' >&2; exit 1; }
  mkdir -p \$R/.next/cache/images \$R/public/assets/images/uploads
  # Repo images into the shared upload directory. Clobbering, deliberately: a
  # file the repo changed must reach the server (no-clobber once kept old
  # photographs live under new captions). Files only on the server — admin
  # uploads since the last commit — are untouched.
  cp -a $APP/src/public/assets/images/uploads/. $APP/uploads/images/
  find $APP/uploads/images -type d -exec chmod 755 {} +; find $APP/uploads/images -type f -exec chmod 644 {} +
  # sharp must load on this architecture, in the image the app runs in.
  docker run --rm --user 1003:1003 -v \$R:/app -w /app node:22-bookworm-slim \
    node -e \"require('sharp'); console.log('  sharp loads on', process.arch)\"
  # ...and decodes AVIF correctly on this CPU. sharp 0.34 on ARM64 draws green
  # blocks through every AVIF (scripts/check_sharp_decode.cjs); loading is not
  # the same as working.
  docker run --rm --user 1003:1003 -v \$R:/app -v $APP/src/scripts:/chk:ro \
    -v $APP/uploads/images:/up:ro -w /app node:22-bookworm-slim \
    node /chk/check_sharp_decode.cjs /up/hero-homepage_hero_doctors.avif /up/hero-nri_hero.avif /up/branches-general-medicine.avif
  echo '  release ready:' \$R"

if [[ $SWITCH -eq 0 ]]; then
  say "Staged $STAMP, not switched (--no-switch)"
  exit 0
fi

# ------------------------------------------------------------------ switch
say "Switching"
ssh_ "set -e; ln -sfn $APP/releases/$STAMP $APP/current
  docker compose -p admissionhands -f $APP/compose.yml up -d --force-recreate --no-deps app 2>&1 | tail -2
  for i in \$(seq 1 60); do
    s=\$(docker inspect -f '{{.State.Health.Status}}' admissionhands-app-1 2>/dev/null || echo none)
    [ \"\$s\" = healthy ] && break; sleep 2
  done
  echo \"  app health: \$s\"
  [ \"\$s\" = healthy ] || { docker logs --tail 40 admissionhands-app-1; exit 1; }
  # Files Next serves out of public/ — the break no page check notices.
  for u in /favicon.ico /logo.png /assets/images/logos/logo.avif; do
    c=\$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: www.admissionhands.com' http://127.0.0.1:8150\$u)
    [ \"\$c\" = 200 ] || { echo \"  \$u answers \$c\" >&2; exit 1; }
  done
  echo '  public/ files answer 200'
  cd $APP/releases && ls -1t | tail -n +6 | xargs -r rm -rf"

# ------------------------------------------------------------------ edge
# Logged-out HTML is cached at Cloudflare for five minutes (cf_html_cache.mjs).
# Purge it, or the release is invisible for that long and the admin's "I just
# changed that" looks like a bug. A failed purge does not undo a good deploy —
# the cache simply expires — so it warns rather than fails.
say "Purging Cloudflare"
node scripts/cf_purge.mjs --everything   || echo "  purge failed — logged-out visitors see the previous HTML for up to 5 minutes" >&2

# ------------------------------------------------------------------ verify
say "Checking"
ssh_ "curl -s -o /dev/null -w '  / -> %{http_code} in %{time_total}s\n' -H 'Host: www.admissionhands.com' http://127.0.0.1:8150/"
NEWEST=$(ls -1t public/assets/images/uploads/*.* 2>/dev/null | head -1 || true)
if [[ -n "$NEWEST" ]]; then
  WANT=$(md5sum "$NEWEST" | cut -d' ' -f1)
  GOT=$(ssh_ "md5sum $APP/uploads/images/$(basename "$NEWEST") 2>/dev/null | cut -d' ' -f1" || true)
  [[ "$WANT" == "$GOT" ]] && echo "  $(basename "$NEWEST") on the server matches" \
    || { echo "  $(basename "$NEWEST") differs on the server (local $WANT, server ${GOT:-missing})" >&2; exit 1; }
fi

say "Deployed $STAMP"
echo "  Roll back:  ssh admissionhands@137.23.39.214 'ln -sfn $APP/releases/<older> $APP/current && docker compose -p admissionhands -f $APP/compose.yml up -d --force-recreate --no-deps app'"
