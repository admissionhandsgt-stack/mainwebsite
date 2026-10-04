#!/usr/bin/env bash
#
# Ship the site to the VPS.
#
#   ./scripts/deploy.sh            # build, upload, restart, smoke test
#   ./scripts/deploy.sh --no-build # upload what is already built
#
# The app runs as a plain Node server on the same box as Postgres, because
# Postgres is bound to localhost there and should stay that way. Cloudflare
# Workers cannot reach it — see next.config.mjs.
#
# Bound to 127.0.0.1 on purpose. Caddy is the only thing that should be able
# to reach the app, and until a domain is pointed here nothing external can
# reach it at all.
#
# Deploys are atomic: the new release is unpacked beside the old one and the
# symlink is moved, so a failed upload cannot leave a half-written app being
# served. The previous release stays on disk to roll back to.

set -euo pipefail

HOST="${AH_HOST:-root@38.49.209.165}"
KEY="${AH_SSH_KEY:-D:/Gulshan/Keys/ServoRica_TradeOS}"
APP_DIR="/opt/admissionhands"
PORT="${AH_PORT:-8120}"
SERVICE="admissionhands"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ssh_() { ssh -i "$KEY" -o BatchMode=yes "$HOST" "$@"; }

# After the move to Oracle (scripts/cutover_oracle.sh) this box only forwards
# to Oracle, and `systemctl restart admissionhands` below would stop that
# forward (Conflicts=) and serve a stale database to anyone still reaching it.
# Deploy with scripts/deploy_oracle.sh; to come back here, rollback_oracle.sh.
if [[ "$(ssh_ 'systemctl is-active ah-forward' 2>/dev/null || true)" == active ]]; then
  echo "This box forwards to Oracle now — deploy with ./scripts/deploy_oracle.sh." >&2
  exit 1
fi

# ------------------------------------------------------------------ build
if [[ "${1:-}" != "--no-build" ]]; then
  say "Building"
  npm run build
fi

[[ -f .next/standalone/server.js ]] || {
  echo "No standalone build found. Is output:'standalone' still set in next.config.mjs?" >&2
  exit 1
}

# ------------------------------------------------------------------ package
say "Packaging"
RELEASE="$(date +%Y%m%d-%H%M%S)"
STAGE=".deploy-stage"
rm -rf "$STAGE"
mkdir -p "$STAGE"

# `standalone` omits these two on purpose — Next expects them copied in.
#
# The trailing `/.` on every source matters. `cp -r public "$STAGE/public"`
# copies public *into* an existing directory of that name, and standalone
# already ships one — which produced `public/public/assets` and a 404 on every
# image, including the logo on every page. Copying contents merges instead.
cp -r .next/standalone/. "$STAGE/"
mkdir -p "$STAGE/.next/static" "$STAGE/public"
cp -r .next/static/. "$STAGE/.next/static/"
cp -r public/. "$STAGE/public/"

# Fail loudly rather than shipping a release with no images.
[[ -f "$STAGE/public/assets/images/logos/logo-4k.avif" ]] || {
  echo "Packaging lost public/assets — refusing to ship." >&2
  exit 1
}

tar czf .deploy.tgz -C "$STAGE" .
rm -rf "$STAGE"
echo "  $(du -h .deploy.tgz | cut -f1) to upload"

# ------------------------------------------------------------------ upload
say "Uploading release $RELEASE"
ssh_ "mkdir -p $APP_DIR/releases/$RELEASE"
scp -i "$KEY" -o BatchMode=yes -q .deploy.tgz "$HOST:$APP_DIR/releases/$RELEASE/"
ssh_ "cd $APP_DIR/releases/$RELEASE && tar xzf .deploy.tgz && rm .deploy.tgz"

# The service runs unprivileged, and Next writes its ISR cache inside the
# release. Unpacked as root, every revalidation failed with EACCES and the
# page fell back to rendering on each request.
ssh_ "mkdir -p $APP_DIR/releases/$RELEASE/.next/cache && chown -R admissionhands:admissionhands $APP_DIR/releases/$RELEASE"

# Uploaded files must outlive the release that received them.
#
# A release is a timestamped directory and `current` is a symlink to it, so
# anything written inside the app disappears at the next deploy. That was
# already true of every image an admin uploaded: the 43 files in
# public/assets/images/uploads only survive because they are committed to git,
# and anything added since the last commit was silently lost.
#
# The real store is $APP_DIR/uploads/images, outside the releases, and the
# release gets a symlink to it. Student documents never go near public/ at all
# — see DOCUMENT_STORE and src/lib/documents.ts.
#
# The copy clobbers, and that is the whole point of this comment.
#
# It used to be `cp -an`. No-clobber seeds the shared directory with files it
# does not have and refuses to touch the ones it does — which means a file the
# repo *changed* can never reach the box. Every hero and college photograph
# replaced in a commit stayed exactly as it was in production, while the
# database rows beside them updated, so the pages rendered the old picture under
# the new credit. It was worked around by hand with scp once and came straight
# back the next deploy.
#
# Clobbering costs nothing here: a file the shared directory holds and the
# release does not is still left alone, so an image an admin uploaded after the
# last commit survives. And an admin upload cannot collide with a repo file in
# the first place — /api/admin/upload generates the name and never uses the
# browser's, so two different images never arrive under one filename.
ssh_ "install -d -o admissionhands -g admissionhands -m 755 $APP_DIR/uploads/images       && install -d -o admissionhands -g admissionhands -m 700 $APP_DIR/uploads/documents       && if [ -d $APP_DIR/releases/$RELEASE/public/assets/images/uploads ] && [ ! -L $APP_DIR/releases/$RELEASE/public/assets/images/uploads ]; then            cp -a $APP_DIR/releases/$RELEASE/public/assets/images/uploads/. $APP_DIR/uploads/images/ 2>/dev/null || true;            rm -rf $APP_DIR/releases/$RELEASE/public/assets/images/uploads;          fi       && ln -sfn $APP_DIR/uploads/images $APP_DIR/releases/$RELEASE/public/assets/images/uploads       && chown -h admissionhands:admissionhands $APP_DIR/releases/$RELEASE/public/assets/images/uploads       && chown -R admissionhands:admissionhands $APP_DIR/uploads"
# Next's optimised-image cache outlives the release, like the uploads do.
#
# Every /_next/image response is encoded once and kept in .next/cache/images -
# inside the release directory, so each deploy threw it away and the first
# visitor after a release paid for re-encoding every image they looked at. The
# live release had built 32 MB of it in a day. Kept in one shared place, an
# image is encoded once, ever, per size and format.
#
# Only images/, never the whole of .next/cache: fetch-cache beside it holds
# unstable_cache results - database answers - and carrying those across a
# deploy would serve the old code's data under the new code.
#
# Seeded from the outgoing release on first use, so the switch starts warm.
ssh_ "C=$APP_DIR/shared/next-image-cache; R=$APP_DIR/releases/$RELEASE/.next/cache;       install -d -o admissionhands -g admissionhands -m 755 \$C       && if [ -z \"\$(ls -A \$C 2>/dev/null)\" ] && [ -d $APP_DIR/current/.next/cache/images ] && [ ! -L $APP_DIR/current/.next/cache/images ]; then            cp -a $APP_DIR/current/.next/cache/images/. \$C/ 2>/dev/null || true;          fi       && install -d -o admissionhands -g admissionhands -m 755 \$R       && rm -rf \$R/images && ln -sfn \$C \$R/images       && chown -h admissionhands:admissionhands \$R/images && chown -R admissionhands:admissionhands \$C"
# The native halves of sharp are built for the machine that ran npm install.
#
# This repo is developed on Windows, so the node_modules the standalone build
# carries hold @img/sharp-win32-x64 and nothing else. Node then refuses to load
# sharp on the box, Next falls back to no image optimisation, and every
# /_next/image request answers 500 — 96 of them in the day this was found. The
# page still renders, which is why it went unnoticed.
#
# The linux binaries are installed once into $APP_DIR/shared/native and linked
# into each release, so a deploy from any machine lands a working sharp.
ssh_ "set -e; S=$APP_DIR/shared/native;   if [ ! -d \$S/node_modules/@img/sharp-linux-x64 ]; then     install -d \$S && cd \$S && npm install --no-save --no-audit --no-fund --os=linux --libc=glibc --cpu=x64 sharp@\$(node -e \"process.stdout.write(require('$APP_DIR/releases/$RELEASE/node_modules/sharp/package.json').version)\") >/dev/null;   fi;   D=$APP_DIR/releases/$RELEASE/node_modules/@img;   for pkg in sharp-linux-x64 sharp-libvips-linux-x64; do     rm -rf \$D/\$pkg && ln -s \$S/node_modules/@img/\$pkg \$D/\$pkg;   done;   cd $APP_DIR/releases/$RELEASE && node -e \"require('sharp')\""

# Did the images this deploy carries actually land?
#
# The copy above is a shell one-liner over ssh with `|| true` on it, so a
# failure there is silent by construction — and the failure it had was silent in
# a worse way: it succeeded, and simply declined to update anything. The symptom
# is a page rendering last month's photograph under this month's caption, which
# nothing else in this script would notice.
#
# So: take the image the working tree changed most recently, and check the bytes
# on the box are the same bytes. One file is enough — they all travel together.
say "Checking the images landed"
NEWEST=$(ls -1t public/assets/images/uploads/*.avif 2>/dev/null | head -1)
if [[ -n "$NEWEST" ]]; then
  WANT=$(md5sum "$NEWEST" | cut -d' ' -f1)
  GOT=$(ssh_ "md5sum $APP_DIR/uploads/images/$(basename "$NEWEST") 2>/dev/null | cut -d' ' -f1" || true)
  if [[ "$WANT" != "$GOT" ]]; then
    echo "  $(basename "$NEWEST") on the box does not match the one just shipped." >&2
    echo "  local $WANT / box ${GOT:-missing}" >&2
    echo "  The shared uploads directory did not take the update — see the cp above." >&2
    exit 1
  fi
  echo "  $(basename "$NEWEST") matches"
fi

rm -f .deploy.tgz

# ------------------------------------------------------------------ switch
say "Switching"
ssh_ "ln -sfn $APP_DIR/releases/$RELEASE $APP_DIR/current && systemctl restart $SERVICE"

# Keep the last five releases so there is always something to roll back to.
ssh_ "cd $APP_DIR/releases && ls -1t | tail -n +6 | xargs -r rm -rf"

# ------------------------------------------------------------------ verify
say "Waiting for it to answer"
for i in $(seq 1 30); do
  if ssh_ "curl -sf -o /dev/null http://127.0.0.1:$PORT/" 2>/dev/null; then
    echo "  up after ${i}s"
    break
  fi
  [[ $i -eq 30 ]] && {
    echo "  never answered — last 30 log lines:" >&2
    ssh_ "journalctl -u $SERVICE -n 30 --no-pager" >&2
    exit 1
  }
  sleep 1
done

say "Deployed: $RELEASE"
echo "  Roll back with:"
echo "    ssh $HOST 'ls $APP_DIR/releases'"
echo "    ssh $HOST 'ln -sfn $APP_DIR/releases/<older> $APP_DIR/current && systemctl restart $SERVICE'"
echo
echo "  Verify it properly (tunnel, then smoke):"
echo "    ssh -i \"$KEY\" -N -L $PORT:localhost:$PORT $HOST"
echo "    npm run smoke -- http://localhost:$PORT"
