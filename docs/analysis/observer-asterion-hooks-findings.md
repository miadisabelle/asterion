# The observer/asterion/hooks analysis — findings of record (2026-08-05)

Two survey lanes over ceremony-session-observer, asterion, @miadi/hooks-core,
@miadi/hooks-gateway, the @medicine-wheel suite (0.5.8) and forgewright.
Visual companion: `ceremony-event-architecture.html` (this folder). Ceremony:
`ceremony:1785951385863:ewv6e` · tlid 2608051332 · lineage
miadichronicle://090 ↔ miadichronicle://311.

## The thesis: wake, not build

Four rooms hold finished tools asleep on the bench:
- **hooks-core 0.5.0** — 22 canonical events, versioned envelopes, sha256
  idempotency, 5-agent native-event map, byte-parity sinks — no hook invokes
  it; the live path is still shell (`/src/scripts/claude_hooks/*.sh`).
- **hooks-gateway 0.1.0** — first-witness ledger (202/200-duplicate),
  StreamPublisher fan-out — no process runs it.
- **asterion** — Redis queue/idempotency/locks exported, zero callers; the
  `entities.external_id/external_source` seam (the door for sessions,
  ceremonies, wheel nodes) is empty.
- **forgewright** — complete GraphView unwired behind a placeholder tab;
  `Session` node typed, colored, scope-filtered, and never minted.

## Asterion, specifically

- `Entity`/`Relation` structurally duplicate ontology-core's
  `RelationalNode`/`RelationalEdge` — minus `strength`,
  `ceremony_honored`, `obligations` (the accountability fields).
- `Phase` (germination/assimilation/completion) is **exactly**
  ontology-core's `TensionPhase` — the vocabulary is pre-agreed.
- `relation_type` is a free string inside a Postgres unique key — two
  spellings of one relation mint two edges.
- The hand-written recursive CTE (`getTensionGraph`) and 10-iteration
  force-sim have package replacements (`relational-query`, `graph-viz`);
  `@xyflow/react` is declared and used nowhere.
- The append-only `asterion.events` log is asterion's genuine own — no
  wheel package owns one. Its `POST /api/events` does not yet consult the
  package's own idempotency helpers.

## The observer, specifically

- Reads exactly two env vars; carried 24 dead credential keys copied from
  asterion's Vercel pull (subtraction ruled).
- `lib/sessions.ts`/`lib/redis.ts` are 8/8 + 7/8 symbol-identical to
  `@medicine-wheel/session-reader`/`data-store` 0.5.8 — the swap deletes
  ~410 lines; three behaviors (SCAN fallback, sessionCount, defaulting)
  move to routes.
- One shared Upstash Redis across observer + asterion + the wheel MCP; only
  asterion prefixes its keys.

## The architecture (ep090 · 2-1-miadi-hooks-pub-sub)

hooks → gateway ledger → StreamPublishers: data-store writers · asterion
events+entities (through the external_id seam) · forgewright ingestSession ·
`@miadi/hooks-artifact-composer` (published stub — artifacts as
subscriptions, provenance-attributed). External transports (Google Pub/Sub,
per ep090's 2-2 practice) remain transports, never the first witness.
