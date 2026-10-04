#!/usr/bin/env bash
# Nightly backup of Admission Hands on the Oracle Mumbai server.
#
# Installed at /opt/admissionhands/bin/backup.sh and run from the
# admissionhands user's crontab (there is no systemd access on this box):
#
#   15 21 * * *  /opt/admissionhands/bin/backup.sh >> /opt/admissionhands/backups/backup.log 2>&1
#
# 21:15 UTC is 02:45 in India — the quietest hour the site has.
#
# What it keeps, named by date (UTC):
#   db/YYYY-MM-DD.dump        pg_dump -Fc, run inside the Postgres container
#   uploads/YYYY-MM-DD.tar.gz /opt/admissionhands/uploads, documents included
#   env/YYYY-MM-DD.env        the app's .env (UNLOCK_SECRET, OTP_SECRET, DOCUMENT_KEY)
#
# 14 days locally in /opt/admissionhands/backups, 30 days in the private Oracle
# Object Storage bucket `admissionhands-backups`. The script prunes both itself.
#
# Authentication is the instance principal — the server is allowed to write to
# the bucket and holds no keys. The bucket is private (NoPublicAccess); it is
# the only place documents or the env may ever leave this machine to.
#
# The Always Free tier gives 20 GB of Object Storage, shared with AutoLoom
# Analytics. One night is ~35 MB today, so 30 nights is ~1 GB; the script
# warns past 8 GB rather than letting it creep.
set -euo pipefail

export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
APP=/opt/admissionhands
DIR=$APP/backups
NS=bmwd2yuhddn0
BUCKET=admissionhands-backups
DB_CONTAINER=admissionhands-db-1
LOCAL_DAYS=14
BUCKET_DAYS=30
WARN_BYTES=$((8 * 1024 * 1024 * 1024))

D=$(date -u +%F)
log() { printf '%s  %s\n' "$(date -u +%FT%TZ)" "$*"; }
oci_() { oci --auth instance_principal "$@"; }

umask 077
mkdir -p "$DIR/db" "$DIR/uploads" "$DIR/env"
log "backup $D starting"

# ---- 1. database ---------------------------------------------------------
# Inside the container, so the dump is made by the same Postgres version that
# serves the data. Written to a temp name and moved, so a half-written dump
# never sits under a real date.
docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$DIR/db/.$D.dump.part"
# A dump that pg_restore cannot read is not a backup. Listing its table of
# contents is cheap and catches truncation.
docker exec -i "$DB_CONTAINER" pg_restore --list < "$DIR/db/.$D.dump.part" > /dev/null
mv "$DIR/db/.$D.dump.part" "$DIR/db/$D.dump"
log "db       $(du -h "$DIR/db/$D.dump" | cut -f1)"

# ---- 2. uploads (images and the private documents folder) -----------------
tar -C "$APP" -czf "$DIR/uploads/.$D.tar.gz.part" uploads
mv "$DIR/uploads/.$D.tar.gz.part" "$DIR/uploads/$D.tar.gz"
log "uploads  $(du -h "$DIR/uploads/$D.tar.gz" | cut -f1)"

# ---- 3. env ------------------------------------------------------------------
# Without DOCUMENT_KEY the stored documents cannot be decrypted, so a database
# backup without it restores rows nobody can read.
cp "$APP/.env" "$DIR/env/$D.env"
chmod 600 "$DIR/env/$D.env"
log "env      copied"

# ---- 4. to the bucket ----------------------------------------------------------
for f in "db/$D.dump" "uploads/$D.tar.gz" "env/$D.env"; do
  oci_ os object put --namespace "$NS" --bucket-name "$BUCKET" \
    --name "$f" --file "$DIR/$f" --force >/dev/null
  log "uploaded $f"
done

# ---- 5. prune locally (14 days) ----------------------------------------------
find "$DIR/db" "$DIR/uploads" "$DIR/env" -type f -mtime +$LOCAL_DAYS -print -delete \
  | sed 's/^/  removed local /' || true

# ---- 6. prune the bucket (30 days) ---------------------------------------------
# By the date in the object's name, not its upload time: a re-run on a later
# day must not make an old backup look new.
CUTOFF=$(date -u -d "-$BUCKET_DAYS days" +%F)
oci_ os object list --namespace "$NS" --bucket-name "$BUCKET" --all \
     --fields name,size --query 'data[].name' --raw-output 2>/dev/null \
  | jq -r '.[]?' \
  | while read -r name; do
      day=$(basename "$name" | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}' || true)
      if [[ -n "$day" && "$day" < "$CUTOFF" ]]; then
        oci_ os object delete --namespace "$NS" --bucket-name "$BUCKET" --object-name "$name" --force >/dev/null
        log "deleted from bucket $name"
      fi
    done

# ---- 7. size guard ----------------------------------------------------------------
TOTAL=$(oci_ os object list --namespace "$NS" --bucket-name "$BUCKET" --all --fields size \
          --query 'sum(data[].size)' --raw-output 2>/dev/null || echo 0)
TOTAL=${TOTAL%%.*}
# An empty bucket answers "null", not 0.
[[ "$TOTAL" =~ ^[0-9]+$ ]] || TOTAL=0
log "bucket   $(( ${TOTAL:-0} / 1024 / 1024 )) MB in total"
if (( ${TOTAL:-0} > WARN_BYTES )); then
  log "WARNING: bucket is over 8 GB — the free tier is 20 GB, shared with analytics"
fi

log "backup $D done"
