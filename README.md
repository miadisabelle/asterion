# Asterion

**The factory's event-driven surface** — structural tension charts
(germination → assimilation → completion), entities, relations, an
append-only event log, MMOT evaluations and narrative threads, rendered as
routes.

Live from three angles: https://asterion.jgwill.com ·
https://asterion.sancuaireagentique.com · https://asterion.tushell.com

- `app/` — the Next.js application (born in `jgwill/Miadi`
  `packages/asterion`; this repo is its public home, long charted as
  "Asterion stands public at miadisabelle/asterion").
- `packages/asterion/` — **`@miadi/asterion`** on npm: the contract as
  types.
- `docs/analysis/` — the 2026-08-05 observer/asterion/hooks architecture
  findings and the ceremony-event visualization; the ontology-core
  alignment path is recorded there, not hidden.

Kinship: `@medicine-wheel/*` (the vocabulary this graph is converging
toward), `@miadi/hooks-core` / `hooks-gateway` (the event spine),
`@miadi/hooks-artifact-composer` (artifacts as subscriptions),
miadichronicle://090 and miadichronicle://311.

---

## Running it

Asterion needs a Neon Postgres database and an Upstash Redis instance.

```bash
cd app
cp .env.example .env.local     # fill in DATABASE_URL and the KV_REST_API_* pair
pnpm install
pnpm db:provision              # build the schema, seed the layer taxonomy
pnpm build && pnpm start       # http://localhost:3336  (PORT to override)
```

`pnpm dev` for the development server.

## Provisioning a database

The v0 draft created its tables through the Neon console, so for a while the
schema existed only inside one instance — a fresh database would have come up
empty with nothing to rebuild it from. `app/db/` closes that:

| file | holds |
|---|---|
| `db/schema.sql` | 18 tables, 28 foreign keys, 27 indexes — introspected back out of the live instance, not hand-written |
| `db/seed.sql` | the layer taxonomy (Runtime, Memory, Governance, PDE, Docs, Security, Operator) that the `/layers` surface reads |

```bash
pnpm db:provision   # schema + reference data
pnpm db:schema      # schema only
pnpm db:verify      # report what is there, change nothing
```

Every statement is `IF NOT EXISTS` or `ON CONFLICT DO NOTHING`, and constraints
that already exist are skipped rather than fatal — replaying against a
provisioned database is a no-op. Point `DATABASE_URL` at a new Neon instance and
`pnpm db:provision` stands the whole surface up from zero.

## Where the data comes from

Asterion's own surfaces write rows, and one other source fills it: coaia-narrative
JSONL memories, the chart format `avadisabelle/coaia-narrative` defines and its MCP
server writes. The JSONL stays the record; Asterion holds its projection, grouped
by **project**, and nothing is written back.

One mapper, `app/lib/asterion/coaia-projection.mjs`, and three ways in:

| way in | when | how |
|---|---|---|
| the registry sync | a registered project's files changed | `pnpm coaia:sync`, or the timer in `scripts/ops/` |
| the door | a writer posts what it just wrote | `POST /api/ingest/coaia-narrative` with `Authorization: Bearer $ASTERION_INGEST_TOKEN` |
| by hand | a one-off file | `node scripts/import-coaia-jsonl.mjs <file> --project <key> [--apply]` |

```bash
# register a project: a file in a git repository, read from origin/main
node scripts/coaia-sync.mjs register coaia-agent --name "COAIA Agent" \
  --git /workspace/repos/jgwill/coaia-agent --path .coaia/narrative/coaia-agent-memory.jsonl
node scripts/coaia-sync.mjs list
node scripts/coaia-sync.mjs sync            # --force, --dry-run, --prune
```

A project is one `asterion.projects` row; its files live in `metadata.source.files`
and each chart it carries joins it through `project_tensions`. Every projected row
carries `external_source = coaia-narrative:<project>` and `external_id` = the
record's own name, so a second pass updates rather than duplicates. A project that
is not registered is never read and the door refuses it: what reaches the three
public domains is decided at registration.

The door is off unless `ASTERION_INGEST_TOKEN` is set, never prunes (it may be
sent one file of several), and logs `tension.projected` only for charts whose
content changed plus one `coaia.projected` per pass, with the writer as actor.

## Surfaces

| route | what it carries |
|---|---|
| `/bridge` | where the charts come from, live: the writer→door and git→sync paths, registered projects, and each chart as it arrives |
| `/tensions` | structural tension charts — desired outcome, current reality, phase, action steps, telescoping, MMOT |
| `/events` | the append-only event log; `POST /api/events` is the write path |
| `/graph` | entities, relations and observations as a traversable graph |
| `/threads` | narrative threads and beats |
| `/layers` `/projects` `/docs` | the layer taxonomy, cross-repo project lenses, and a self-editing docs surface |
| `/feed` | per-tenant RSS, resolved from the `Host` header (`?domain=` to preview) |
