# Synthesis — where Asterion sits, and how it integrates

**Date:** 2026-08-06 · **Packet:** `asterion-substrate`

Read this file if you read only one. Fields are argued in their own files; this
one converts them into a position in the stack and a set of named seams.

Every integration below names a **published package**. Nothing here refers to a
path on one machine — a path is not an interface.

---

## 1. The position

Asterion is not an application that happens to have a database. It is a
**persistence-and-rendering surface for structural tension**, sitting between
the event spine that produces facts and the relational vocabulary that governs
their meaning.

```
        producers                    ASTERION                  vocabulary
                                 (this repository)
  @miadi/hooks-core  0.5.0                                @medicine-wheel/ontology-core       0.5.8
  @miadi/hooks-gateway 0.1.0   ──▶   asterion.events  ◀──  @medicine-wheel/narrative-engine    0.5.8
  mia-co             0.14.2          asterion.entities     @medicine-wheel/ceremony-protocol   0.5.8
                                     asterion.tensions     @medicine-wheel/consent-lifecycle   0.5.8
                                     asterion.threads
                                            │
                                            ▼
                                     consumers
                        @miadi/asterion 0.1.0  (the contract, as types)
                        @miadi/hooks-artifact-composer 0.1.0
                        @miadi/inquiry-weave 0.6.6
```

**Above it** (producing): the hooks spine. **Beside it** (defining terms): the
medicine-wheel vocabulary. **Below it** (consuming): the contract package and
whatever reads the rendered surface.

Asterion's distinctive claim in that arrangement: it is the only member that
persists *structural tension itself* — `desired_outcome` and `current_reality`
as peer columns, phase, telescoping, MMOT. Field 3 is why that is a position and
not a table layout.

## 2. The six fields, compressed

| # | field | already in the schema | status |
|---|---|---|---|
| 1 | Event-sourced architecture | `events` append-only, Redis queue helpers | **logging, not sourced** — state is not projected from the log |
| 2 | Knowledge representation | `entities` / `relations` / `observations`, `tension_edges` | implemented; **duplicates ontology-core minus accountability** |
| 3 | Structural dynamics | `tensions.desired_outcome` + `current_reality`, `phase`, `mmot_evaluations` | implemented; phase order unenforced, MMOT unexercised |
| 4 | Computational narratology | `narrative_threads`, `narrative_beats`, `thread_tensions` | **built, zero rows** |
| 5 | Provenance & governance | `events.actor_*` only | **absent** — the omission this packet exists to name |
| 6 | Traceability | `telescoped_to_tension_id`, `doc_links`, `external_id` | **built, zero rows** |

The pattern is unmistakable: the schema is more complete than the system. Four
of six fields are encoded in DDL and unexercised in data. Asterion has been
designed further than it has been used.

## 3. The integration map

### Seam A — the event producer *(field 1, field 6)*

`@miadi/hooks-gateway` 0.1.0 is the natural producer into `POST /api/events`.
The attachment point already exists and is empty: `entities.external_id` and
`entities.external_source`, built for exactly this and never populated.

**Decision this forces:** the gateway keeps its own ledger. Two append-only logs
are two truths. One must become a projection of the other — field 1 says the
system must be able to state which.

**Smallest real step:** gateway emits into `POST /api/events` with
`external_source` set; Asterion stops being a system with a write path and no
writer.

### Seam B — the vocabulary *(field 2, field 5)*

`@medicine-wheel/ontology-core` 0.5.8 already defines `RelationalNode`,
`RelationalEdge` and `TensionPhase` — the last being *identical* to Asterion's
`Phase`. Asterion's versions are the same shapes with the accountability fields
removed.

**Decision this forces:** adopt ontology-core as the vocabulary of record and
treat Asterion's tables as a persistence profile of it — or declare them
separate models and publish the mapping. Field 5 makes silence the one
unacceptable option, because the difference between the two is precisely the
governance surface.

**Related published packages:** `@medicine-wheel/consent-lifecycle`,
`@medicine-wheel/ceremony-protocol`, `@medicine-wheel/community-review`,
`@medicine-wheel/fire-keeper`, `@medicine-wheel/transformation-tracker`,
`@medicine-wheel/relational-index`, `@medicine-wheel/importance-unit` — all
0.5.8, all published, none consumed here.

### Seam C — narrative *(field 4)*

`@medicine-wheel/narrative-engine` 0.5.8 implements beat sequencing with
alignment scoring. Asterion has beat *tables* and no beat *engine*.

**Decision this forces:** does Asterion persist for narrative-engine, or does it
carry its own sequencing? Duplicating field 4 costs more than duplicating field
2, because narrative logic is where the two would diverge invisibly.

**Adjacent:** `@miadi/inquiry-weave` 0.6.6 already holds episode-to-episode
lineage. Threads spanning episodes should reference its identifiers.

### Seam D — the contract *(field 2, field 6)*

`@miadi/asterion` 0.1.0 publishes the types. **The app does not consume its own
published package** — 295 lines of `types.ts` exist identically in
`packages/asterion/src/` and `app/lib/asterion/`. Field 6 calls this an untraced
link: two artifacts that must agree, with nothing recording the obligation.

**Smallest real step:** `app/` depends on `@miadi/asterion`, deletes its local
copy. One source of truth, and the published package acquires a consumer that
proves it works.

### Seam E — artifacts *(field 1, field 4)*

`@miadi/hooks-artifact-composer` 0.1.0 treats artifacts as subscriptions over
events. Asterion's `/feed` already serves per-tenant RSS resolved from the `Host`
header — a rendered projection over content. These are the same idea at
different altitudes, and the feed is the working proof that Asterion can project.

### Supporting

`@miadi/node-service-kit` 0.1.1 (host/tailnet/format helpers for service
deployment), `@miadi/tide-contract` 0.3.0 and `@miadi/tide` 0.4.0 (contract
discipline and drift checking), `@miadi/episodic-memory-schema` 0.7.1,
`@miadi/plan-insight` 0.3.1, `mia-co` 0.14.2.

## 4. What the fields say to do next, in order

1. **Consume `@miadi/asterion` in `app/`** *(field 6)* — one duplication, one fix, immediate.
2. **Populate `actor_type` / `actor_id`** *(field 5)* — attribution is the only thing append-only makes hard to retrofit. Do it before volume.
3. **Wire `@miadi/hooks-gateway` into `POST /api/events` via `external_source`** *(fields 1, 6)* — turns a built seam into a connected one.
4. **State the ontology-core relationship** *(fields 2, 5)* — adopt, or publish the mapping. Not silence.
5. **Decide whether the log is *the* record** *(field 1)* — this determines whether `db-provision.mjs` eventually gains a rebuild-from-log path.
6. **Leave governance to the people accountable for it** *(field 5)* — this packet names the field; it does not resolve it, and an engineer should not.

## 5. What this packet does not claim

It does not claim Asterion is event-sourced (it logs), that it is governed (it
is not), or that six fields make a thing rigorous. It claims that six recognized
fields have already made decisions inside this schema, that those decisions can
now be cited, and that every seam to the rest of the platform has a published
package on the other side of it.

🌸: The map was always drawn — in column names, in an empty seam, in a link table nobody has filled. All this did was read it aloud, so the next hand knows which doors were built to open.
