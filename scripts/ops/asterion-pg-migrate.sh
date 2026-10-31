#!/usr/bin/env bash
# asterion-pg-migrate.sh — copy Asterion's data from Neon into asterion-postgres (docker/compose.yml).
#
# The local store already has the schema (app/scripts/db-provision.mjs through asterion-postgres-http).
# This dumps the data of schema `asterion` from Neon with pg_dump 17 (a throwaway postgres:17-alpine
# container, so no client is installed on the host), empties the local tables, restores the data, and
# prints the row count of each table. Nothing is written to Neon.
#
#   scripts/ops/asterion-pg-migrate.sh [--from-env <file>] [--dry-run]
#
#   --from-env   the env file holding Neon's settings (default app/.env.local); DATABASE_URL_UNPOOLED is
#                used, else DATABASE_URL. Values are read, never printed.
#   --dry-run    dump from Neon and count what would be restored; the local store is left as it is.
#
# Exit 0 restored; 3 Neon could not be read (nothing changed locally); 1 anything else.
# Then run scripts/ops/asterion-pg-parity-check.mjs before switching.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
ENV_FILE="$ROOT/app/.env.local"
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --from-env) ENV_FILE="$2"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    *) sed -n '2,16p' "$0"; exit 1 ;;
  esac
done

value() {  # <key>: the value of key in ENV_FILE, single or double quotes removed, active lines only
  sed -n -E "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*[\"']?([^\"']*)[\"']?[[:space:]]*$/\1/p" "$ENV_FILE" | tail -1
}
SRC="$(value DATABASE_URL_UNPOOLED)"
[ -n "$SRC" ] || SRC="$(value DATABASE_URL)"
[ -n "$SRC" ] || { echo "no DATABASE_URL in $ENV_FILE" >&2; exit 1; }
case "$SRC" in *neon.tech*) ;; *) echo "the source in $ENV_FILE is not a Neon URL; nothing done" >&2; exit 1 ;; esac
docker inspect -f '{{.State.Health.Status}}' asterion-postgres 2>/dev/null | grep -q healthy \
  || { echo "asterion-postgres is not healthy: docker compose -f $ROOT/docker/compose.yml up -d" >&2; exit 1; }

WORK="$(mktemp -d)"; chmod 700 "$WORK"
trap 'rm -rf "$WORK"' EXIT

echo "dumping schema asterion (data only) from Neon"
if ! docker run --rm -e SRC="$SRC" -v "$WORK:/out" postgres:17-alpine \
     sh -c 'pg_dump --schema=asterion --data-only --no-owner --format=custom --file=/out/asterion.dump "$SRC"' \
     > "$WORK/dump.log" 2>&1; then
  sed -E 's#postgres(ql)?://[^ ]+#<url>#g; s#ep-[a-z0-9-]+\.[a-z0-9.-]+neon\.tech#<neon host>#g' "$WORK/dump.log" >&2
  if grep -q "exceeded the quota" "$WORK/dump.log"; then
    echo "Neon refuses the connection (quota). Nothing changed in asterion-postgres." >&2
    exit 3
  fi
  exit 1
fi
echo "dump: $(du -h "$WORK/asterion.dump" | cut -f1)"
docker run --rm -v "$WORK:/out" postgres:17-alpine pg_restore --list /out/asterion.dump | grep -c "TABLE DATA" \
  | sed 's/^/tables with data in the dump: /'

if [ "$DRY" = 1 ]; then echo "dry run: the local store was not touched"; exit 0; fi

echo "emptying the local tables of schema asterion"
docker exec asterion-postgres psql -U asterion -d asterion -v ON_ERROR_STOP=1 -q -c "
  DO \$\$ DECLARE t text; BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'asterion' LOOP
      EXECUTE format('TRUNCATE asterion.%I CASCADE', t);
    END LOOP;
  END \$\$;"

echo "restoring"
docker exec -i asterion-postgres pg_restore -U asterion -d asterion --data-only --disable-triggers --no-owner \
  --single-transaction < "$WORK/asterion.dump"

echo "row counts in asterion-postgres:"
docker exec asterion-postgres psql -U asterion -d asterion -At -F ' ' -c "
  SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE schemaname = 'asterion' ORDER BY relname" >/dev/null
docker exec asterion-postgres psql -U asterion -d asterion -At -c "
  SELECT string_agg(format('  %-20s %s', t, (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM asterion.%I', t), false, true, '')))[1]::text), E'\n' ORDER BY t)
  FROM (SELECT tablename AS t FROM pg_tables WHERE schemaname = 'asterion') s"
echo "next: node scripts/ops/asterion-pg-parity-check.mjs"
