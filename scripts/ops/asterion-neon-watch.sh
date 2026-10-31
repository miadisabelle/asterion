#!/usr/bin/env bash
# asterion-neon-watch.sh — wait for Neon to answer again, then copy it read-only and stage the merge.
#
# Since 2026-10-31 Asterion runs on asterion-postgres with provisional data, while Neon refuses every connection
# (quota exceeded) and still holds what only it had. Run by asterion-neon-watch.timer every 6 hours, this:
#   1. tries pg_dump of schema asterion from Neon (settings in ~/.config/asterion/neon.env); a refusal is logged
#      and the next run tries again;
#   2. once it answers, restores the dump into the database asterion_neon of asterion-postgres (never into the
#      live database asterion) and records each table's row count;
#   3. writes the merge brief (asterion-neon-merge-brief.md + the counts) to ~/workspace/factory/missions/;
#   4. stages an agent seat: tmux session asterion-neon-merge in the repo, its command typed and not sent, so the
#      merge starts when a person presses Enter;
#   5. marks itself done and disables its timer. Nothing is ever written to Neon.
#
#   scripts/ops/asterion-neon-watch.sh             one pass (what the timer runs)
#   scripts/ops/asterion-neon-watch.sh --install   install and start the user timer
#   scripts/ops/asterion-neon-watch.sh --status    timer, last result, snapshot counts
#   scripts/ops/asterion-neon-watch.sh --self-test copy the live local database instead of Neon into
#                                                  asterion_neon_selftest, to exercise steps 2 and 3 (no seat)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
NEON_ENV="${ASTERION_NEON_ENV:-$HOME/.config/asterion/neon.env}"
STATE="${XDG_STATE_HOME:-$HOME/.local/state}/asterion"
MISSIONS="${ASTERION_MISSIONS_DIR:-$HOME/workspace/factory/missions}"
SEAT="asterion-neon-merge"
UNIT="asterion-neon-watch"
mkdir -p "$STATE"
log() { echo "asterion-neon-watch: $*"; }

install_units() {
  local dir="$HOME/.config/systemd/user"
  mkdir -p "$dir"
  cat > "$dir/$UNIT.service" <<EOF
[Unit]
Description=Asterion: copy Neon read-only once it answers again, then stage the merge (scripts/ops/asterion-neon-watch.sh)
After=docker.service

[Service]
Type=oneshot
ExecStart=/bin/bash $HERE/asterion-neon-watch.sh
EOF
  cat > "$dir/$UNIT.timer" <<EOF
[Unit]
Description=Asterion: try Neon every 6 hours until it answers (asterion-neon-watch.sh)

[Timer]
OnBootSec=10min
OnUnitActiveSec=6h
Persistent=true

[Install]
WantedBy=timers.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now "$UNIT.timer"
  log "installed $UNIT.timer"
}

status() {
  systemctl --user list-timers --all --no-pager 2>/dev/null | grep -E "NEXT|$UNIT" || true
  [ -f "$STATE/neon-watch.last" ] && log "last pass: $(cat "$STATE/neon-watch.last")"
  [ -f "$STATE/neon-snapshot.json" ] && cat "$STATE/neon-snapshot.json"
  [ -f "$STATE/neon-snapshot.done" ] && log "done: $(cat "$STATE/neon-snapshot.done")"
  return 0
}

case "${1:-}" in
  --install) install_units; exit 0 ;;
  --status) status; exit 0 ;;
  --self-test) SELFTEST=1 ;;
  "") SELFTEST=0 ;;
  *) sed -n '2,22p' "$0"; exit 1 ;;
esac

if [ "$SELFTEST" = 0 ] && [ -f "$STATE/neon-snapshot.done" ]; then log "already done ($(cat "$STATE/neon-snapshot.done"))"; exit 0; fi
docker inspect -f '{{.State.Health.Status}}' asterion-postgres 2>/dev/null | grep -q healthy \
  || { log "asterion-postgres is not healthy; trying again next run"; exit 0; }

WORK="$(mktemp -d)"; chmod 700 "$WORK"
trap 'rm -rf "$WORK"' EXIT
psql_local() { docker exec -i asterion-postgres psql -U asterion -v ON_ERROR_STOP=1 -q "$@"; }

if [ "$SELFTEST" = 1 ]; then
  TARGET=asterion_neon_selftest
  docker exec asterion-postgres pg_dump -U asterion -d asterion --schema=asterion --no-owner --format=custom > "$WORK/asterion.dump"
else
  TARGET=asterion_neon
  value() { sed -n -E "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*[\"']?([^\"']*)[\"']?[[:space:]]*$/\1/p" "$NEON_ENV" | tail -1; }
  [ -f "$NEON_ENV" ] || { log "no $NEON_ENV"; exit 1; }
  SRC="$(value DATABASE_URL_UNPOOLED)"; [ -n "$SRC" ] || SRC="$(value DATABASE_URL)"
  case "$SRC" in *neon.tech*) ;; *) log "no Neon URL in $NEON_ENV"; exit 1 ;; esac
  if ! docker run --rm -e SRC="$SRC" -v "$WORK:/out" postgres:17-alpine \
       sh -c 'pg_dump --schema=asterion --no-owner --format=custom --file=/out/asterion.dump "$SRC"' > "$WORK/dump.log" 2>&1; then
    if grep -q "exceeded the quota" "$WORK/dump.log"; then
      echo "$(date -Is) refused: quota" > "$STATE/neon-watch.last"; log "Neon still refuses (quota); next try in 6 hours"; exit 0
    fi
    echo "$(date -Is) failed" > "$STATE/neon-watch.last"
    sed -E 's#postgres(ql)?://[^ ]+#<url>#g; s#ep-[a-z0-9-]+\.[a-z0-9.-]+neon\.tech#<neon host>#g' "$WORK/dump.log" | tail -3
    exit 0
  fi
fi
log "dump: $(du -h "$WORK/asterion.dump" | cut -f1)"

psql_local -d asterion -c "SELECT 1 FROM pg_database WHERE datname = '$TARGET'" -At | grep -q 1 \
  || psql_local -d asterion -c "CREATE DATABASE $TARGET"
psql_local -d "$TARGET" -c "DROP SCHEMA IF EXISTS asterion CASCADE"
docker exec -i asterion-postgres pg_restore -U asterion -d "$TARGET" --no-owner --single-transaction < "$WORK/asterion.dump"

counts=$(docker exec asterion-postgres psql -U asterion -d "$TARGET" -At -c "
  SELECT json_object_agg(t, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM asterion.%I', t), false, true, '')))[1]::text::int ORDER BY t)
  FROM (SELECT tablename AS t FROM pg_tables WHERE schemaname = 'asterion') s")
printf '{"database": "%s", "at": "%s", "counts": %s}\n' "$TARGET" "$(date -Is)" "$counts" > "$STATE/neon-snapshot${SELFTEST/1/-selftest}.json"
log "restored into $TARGET: $counts"

brief="$MISSIONS/BRIEF-asterion-neon-merge${SELFTEST/1/-selftest}.md"
mkdir -p "$MISSIONS"
{ cat "$HERE/asterion-neon-merge-brief.md"; printf '\n## Counts in %s at %s\n\n```json\n%s\n```\n' "$TARGET" "$(date -Is)" "$counts"; } > "$brief"
log "brief: $brief"

if [ "$SELFTEST" = 1 ]; then log "self-test: no seat staged; drop it with: docker exec asterion-postgres dropdb -U asterion $TARGET"; exit 0; fi

if ! tmux has-session -t "=$SEAT" 2>/dev/null; then
  tmux new-session -d -s "$SEAT" -c "$ROOT"
  sleep 2
  tmux send-keys -t "=$SEAT" -l "claude \"Read $brief whole, then do it.\""
  log "seat staged: tmux $SEAT, command typed, waiting for Enter"
fi
echo "$(date -Is) Neon copied into $TARGET; seat $SEAT staged" > "$STATE/neon-snapshot.done"
echo "$(date -Is) done" > "$STATE/neon-watch.last"
systemctl --user disable "$UNIT.timer" 2>/dev/null || true
