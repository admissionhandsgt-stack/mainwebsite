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
ssh_ "install -d -o admissionhands -g admissionhands -m 755 $APP_DIR/uploads/images       && install -d -o admissionhands -g admissionhands -m 700 $APP_DIR/uploads/documents       && if [ -d $APP_DIR/releases/$RELEASE/public/assets/images/uploads ] && [ ! -L $APP_DIR/releases/$RELEASE/public/assets/images/uploads ]; then            cp -an $APP_DIR/releases/$RELEASE/public/assets/images/uploads/. $APP_DIR/uploads/images/ 2>/dev/null || true;            rm -rf $APP_DIR/releases/$RELEASE/public/assets/images/uploads;          fi       && ln -sfn $APP_DIR/uploads/images $APP_DIR/releases/$RELEASE/public/assets/images/uploads       && chown -h admissionhands:admissionhands $APP_DIR/releases/$RELEASE/public/assets/images/uploads       && chown -R admissionhands:admissionhands $APP_DIR/uploads"
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
