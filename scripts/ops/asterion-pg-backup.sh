#!/usr/bin/env bash
# asterion-pg-backup.sh — a nightly dump of Asterion's own Postgres, kept where gaia's backup reads.
#
# Since 2026-10-31 Asterion runs on its own Postgres (container asterion-postgres, volume
# asterion-postgres-data) instead of Neon, which kept backups for us. This takes their place:
# one pg_dump of every Asterion database per night, in custom format, into
# /srv/miadi/backups/asterion/. miadi-data-backup.timer (03:34) archives /srv/miadi to /g, and
# miadi-data-backup-offsite.timer copies that archive off the host, so each dump travels with it.
#
#   ./scripts/ops/asterion-pg-backup.sh            dump now, keep the newest KEEP per database
#   ./scripts/ops/asterion-pg-backup.sh --verify   also restore the newest dump into a throwaway
#                                                   database, compare row counts, drop it
#
# Runs as the user unit asterion-pg-backup.timer (scripts/ops/units/). Nothing is printed of the
# database password: pg_dump runs inside the container over its local socket.
set -euo pipefail

CONTAINER="${ASTERION_PG_CONTAINER:-asterion-postgres}"
DEST="${ASTERION_BACKUP_DIR:-/srv/miadi/backups/asterion}"
KEEP="${ASTERION_BACKUP_KEEP:-14}"
VERIFY=0
[ "${1:-}" = "--verify" ] && VERIFY=1

say() { printf '%s asterion-pg-backup: %s\n' "$(date +%T)" "$*"; }
in_pg() { docker exec "$CONTAINER" sh -c "$1"; }

docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null | grep -qx healthy \
    || { say "$CONTAINER is not healthy; nothing dumped"; exit 1; }
mkdir -p "$DEST" && chmod 0770 "$DEST"

stamp=$(date +%y%m%d%H%M)
dbs=$(in_pg 'psql -U "$POSTGRES_USER" -d postgres -At -c "select datname from pg_database where not datistemplate and datname <> '"'postgres'"' order by 1"')
for db in $dbs; do
    out="$DEST/$db-$stamp.dump"
    in_pg "pg_dump -U \"\$POSTGRES_USER\" -d $db -Fc" > "$out.part"
    [ -s "$out.part" ] || { rm -f "$out.part"; say "$db: empty dump"; exit 1; }
    mv -f "$out.part" "$out"
    (cd "$DEST" && sha256sum "$(basename "$out")" > "$(basename "$out").sha256")
    say "$db: $(du -h "$out" | cut -f1) in $out"
    # Keep the newest KEEP dumps of this database.
    ls -1t "$DEST/$db"-*.dump 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
        rm -f "$old" "$old.sha256"
    done
done

if [ "$VERIFY" = 1 ]; then
    newest=$(ls -1t "$DEST"/asterion-*.dump | head -1)
    scratch="asterion_restore_check"
    count_of() {  # <database>: "table=rows ..." for every table of schema asterion
        docker exec -i "$CONTAINER" sh -c 'psql -U "$POSTGRES_USER" -d "$1" -At' sh "$1" <<'SQL'
select string_agg(table_name || '=' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text, ' ' order by table_name)
from information_schema.tables where table_schema = 'asterion' and table_type = 'BASE TABLE';
SQL
    }
    in_pg "dropdb -U \"\$POSTGRES_USER\" --if-exists $scratch && createdb -U \"\$POSTGRES_USER\" $scratch"
    docker exec -i "$CONTAINER" sh -c "pg_restore -U \"\$POSTGRES_USER\" -d $scratch --no-owner" < "$newest"
    live=$(count_of asterion); restored=$(count_of $scratch)
    in_pg "dropdb -U \"\$POSTGRES_USER\" $scratch"
    if [ "$live" = "$restored" ]; then
        say "verify: $(basename "$newest") restores with the same rows in all $(wc -w <<< "$live") tables"
    else
        say "verify: counts differ (writes since the dump can explain it)"; say "live:     $live"; say "restored: $restored"
        exit 2
    fi
fi
