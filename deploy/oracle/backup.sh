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
#   (each with .enc appended in the bucket — see below)
#
# 14 days locally in /opt/admissionhands/backups, 30 days in the private Oracle
# Object Storage bucket `admissionhands-backups`. The script prunes both itself.
#
# Authentication is the instance principal — the server is allowed to write to
# the bucket and holds no keys. The bucket is private (NoPublicAccess); it is
# the only place documents or the env may ever leave this machine to.
#
# ## Everything that leaves the machine is encrypted first
#
# The bucket gets `<name>.enc`: AES-256 under a passphrase in
# /opt/admissionhands/.backup-pass (0600), key stretched with PBKDF2. A private
# bucket is access control, and access control does not travel with a copy —
# the env holds DOCUMENT_KEY, and the dump holds every candidate's phone number.
# Whoever reads the bucket now reads ciphertext.
#
# The passphrase is also in .env.local on the dev machine (BACKUP_PASSPHRASE)
# and must be kept somewhere off this server too: if the server is lost, the
# bucket is only useful to someone who has it. With no passphrase file the
# upload is refused, never sent in the clear.
#
# Restore:
#   oci os object get --auth instance_principal -ns bmwd2yuhddn0 \
#     -bn admissionhands-backups --name db/2026-10-05.dump.enc --file x.enc
#   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
#     -pass file:/opt/admissionhands/.backup-pass -in x.enc -out x.dump
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
PASS_FILE=$APP/.backup-pass

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

# ---- 4. to the bucket, encrypted ---------------------------------------------
# Refuse rather than upload in the clear. The local copies above are already
# made, so a missing passphrase costs the off-site copy, not the backup.
if [[ ! -s "$PASS_FILE" ]]; then
  log "ERROR: $PASS_FILE is missing — nothing uploaded. The local backup is in $DIR."
  exit 1
fi
seal() {
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 -salt \
    -pass "file:$PASS_FILE" -in "$1" -out "$2"
}
unseal() {
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
    -pass "file:$PASS_FILE" -in "$1"
}
for f in "db/$D.dump" "uploads/$D.tar.gz" "env/$D.env"; do
  enc="$DIR/.$(basename "$f").enc"
  seal "$DIR/$f" "$enc"
  # Prove it opens before it becomes the only off-site copy.
  if ! cmp -s <(unseal "$enc") "$DIR/$f"; then
    log "ERROR: $f did not decrypt back to itself — not uploaded"
    rm -f "$enc"
    exit 1
  fi
  oci_ os object put --namespace "$NS" --bucket-name "$BUCKET" \
    --name "$f.enc" --file "$enc" --force >/dev/null
  rm -f "$enc"
  log "uploaded $f.enc"
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
