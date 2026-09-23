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
cp -r .next/standalone/. "$STAGE/"
mkdir -p "$STAGE/.next"
cp -r .next/static "$STAGE/.next/static"
cp -r public "$STAGE/public"

tar czf .deploy.tgz -C "$STAGE" .
rm -rf "$STAGE"
echo "  $(du -h .deploy.tgz | cut -f1) to upload"

# ------------------------------------------------------------------ upload
say "Uploading release $RELEASE"
ssh_ "mkdir -p $APP_DIR/releases/$RELEASE"
scp -i "$KEY" -o BatchMode=yes -q .deploy.tgz "$HOST:$APP_DIR/releases/$RELEASE/"
ssh_ "cd $APP_DIR/releases/$RELEASE && tar xzf .deploy.tgz && rm .deploy.tgz"
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
