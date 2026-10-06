# AGENTS.md

`app/` is the Next app, `packages/asterion` the types it stands on. Vercel serves
the public deployments; on gaia the same app runs as a systemd user service —
`127.0.0.1:3336`, published to the tailnet as `https://asterion.tail3b11eb.ts.net`.

**Never `next build`, `pnpm start`, or `systemctl` the gaia instance by hand.**
Four verbs own it, and they verify what they did:

```bash
./scripts/ops/status.sh      # source · units · tailnet · both doors, one screen
./scripts/ops/rebuild.sh     # build, then hand the new build to the service
./scripts/ops/restart.sh     # restart the running build, no compile
./scripts/ops/logs.sh -f     # what the service is saying
```

Read `scripts/ops/README.md` before changing how any of it runs — it holds the
unit names, the flags, and why the default order is build-then-restart. The units
themselves come from `/opt/gaia/linux_migration/22-asterion-tailscale-autostart.sh`,
which is idempotent.

`app/.env.local` carries the Neon/Redis credentials, is read by `next` at boot
(not per request), and never leaves the machine. It also carries
`ASTERION_INGEST_TOKENS`, one `host=token` pair per machine allowed through the
ingest door: the token names the host, the host is what the event log records for
each arrival, and cutting one machine off is removing its pair and restarting.
The older single `ASTERION_INGEST_TOKEN` still works and reports as `unnamed`.

## Schema changes

A change to the live database is a numbered file, `app/db/migrations/NNN-what-it-does.sql`,
written so that replaying it is a no-op. Fetch origin first and take the next free number.
Apply it alone with `node scripts/db-provision.mjs --migration NNN` from `app/`, and never
edit another lane's migration. A fresh database gets `schema.sql`, then every migration in order.

## Charts and private projects

Charts reach Asterion from coaia-narrative memories registered with
`app/scripts/coaia-sync.mjs`. A memory from a private repository is registered
with `--private` in the same command that first registers it: its rows are then
shown only to signed-in writers. Every GET route asks `viewerOf(request)`
(`app/lib/asterion/visibility.ts`), and `scripts/check-read-gates.mjs` fails the
build when one does not. The practice, the words and the steering design are in
the chart-path skill: `jgwill/miadi-orchestration-kit` `skills/chart-path/SKILL.md`.

## Tushell feed voice

When composing `asterion.tushell.com` feed entries, write as diary fragments from
Tushell's universe rather than as a conventional engineering changelog. Keep the
technical subject concrete, but filter it through the Data Lake / Archive
metaphor: data streams, schools, currents, maps, nodes, storms, fins,
bioluminescence, and Wise Owl's patient guidance. The tone is wonder-filled,
intimate, exploratory, and slightly apprehensive; it should tease a larger story
without retelling Tushell's chapters. For relational-memory work, let Tushell
notice the difference between storing an event and learning what it means in
relation to a participant. Preserve provenance, uncertainty, consent, and human
agency in the subtext: memory can be inferred, confirmed, or rejected, and a
companion is not an oracle. Prefer three concise entries that feel like
successive diary discoveries, with package names and implementation details
embedded naturally in the narrative.
