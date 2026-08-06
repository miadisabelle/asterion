# Intent understanding — asterion-substrate

**Date:** 2026-08-06 · **Packet:** `asterion-substrate`

## Why this packet exists, and why now

Asterion crossed a threshold on 2026-08-06. Until that day it was a prototype
that existed in two divergent copies with zero shared git history, whose
eighteen tables lived only inside one Neon instance because the v0 draft created
them through a console. A new database would have come up empty with nothing to
rebuild it from.

That is now closed: `app/db/schema.sql` is the schema introspected back out,
`app/scripts/db-provision.mjs` replays it idempotently, and the whole surface
was verified standing up from zero — 52 statements, 0 failures, against a
throwaway schema that was then dropped.

A thing that can be reproduced can be *placed*. That is what makes the question
"what fields is this standing on, and where does it fit" answerable now and not
before.

## Audience

| who | what they need from this packet |
|---|---|
| **Whoever wires Asterion to the event spine** | which published package owns which concern, so the seam is chosen rather than improvised |
| **Whoever provisions Asterion under a new account** | confidence that the schema encodes deliberate commitments, not v0 defaults |
| **Whoever reconciles Asterion with `@medicine-wheel/ontology-core`** | an explicit statement of what Asterion's schema omits, and why that omission is a field-level question rather than a merge conflict |
| **Whoever writes about this work** | recognized field names and citable sources, so the claim "this is grounded" survives a reader who checks |

## Current reality

- Asterion runs, provisions from zero, and serves 8 pages and 9 APIs against live Postgres and Redis.
- `@miadi/asterion` 0.1.0 publishes the contract as types — but the app does not consume its own published package; the 295 lines of `types.ts` exist twice.
- The event log has a write path (`POST /api/events`) and no producer. Nothing upstream emits into it.
- `entities.external_id` and `external_source` exist and are empty — a seam built and never connected.
- Asterion's `Entity` and `Relation` duplicate `@medicine-wheel/ontology-core`'s `RelationalNode` and `RelationalEdge` **minus their accountability fields**.
- The Redis idempotency and lock helpers have zero callers.
- Six academic fields are load-bearing in the schema and none of them are named anywhere in the repo.

## Desired state

Asterion is legible as a substrate: a reader can name the disciplines its schema
commits to, locate it in the Miadi stack by published package identity, and see
which seams are connected, which are built-and-waiting, and which are absent by
omission rather than oversight. Integration decisions cite packages on npm, not
paths on one machine.

## Structural tension this packet resolves

Asterion's schema already encodes commitments from six recognized fields — an
append-only log, a property-graph triad, Fritz's structural tension as columns,
narrative beats as rows, trace links as `telescoped_to_tension_id` — while
carrying no statement of what those commitments are or where they came from. The
discrepancy is between **a substrate that behaves as though it were grounded**
and **a repository that cannot show the ground**. That discrepancy is what
generates this work, and it resolves when the ground is named, sourced, and
attached to the stack position it implies.

## Decisions this packet must strengthen

1. **Whether `@medicine-wheel/ontology-core` becomes Asterion's vocabulary or stays adjacent** — field 5 makes this a governance question, not a refactor.
2. **Where the event producer attaches** — field 1 says the log must be the record of truth, which constrains whether `@miadi/hooks-gateway` writes through Asterion or beside it.
3. **Whether the app consumes `@miadi/asterion`** — a duplication that fields 2 and 6 both make expensive.
4. **What ships in a new Neon instance under `miadisabelle`** — schema, reference data, and nothing that field 5 would call someone else's to hold.

## What success makes easier downstream

Deploying Asterion as the event-driven experimentation surface stops being an
act of faith. Each integration seam has a named field behind it, a published
package on the other side of it, and a source that a skeptical reader can check.
