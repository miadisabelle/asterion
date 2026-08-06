# Foundations — Asterion as substrate

**Packet:** `asterion-substrate`
**Generated:** 2026-08-06
**Method:** `deep-research-foundations`
**Verification:** live-web-verified
**Repo:** `miadisabelle/asterion`

Asterion was built before it was named. It arrived as a v0 draft, acquired
eighteen tables and thirty-six routes, and only afterward did anyone ask what
disciplines it had been standing on the whole time. This packet answers that,
and uses the answer to place Asterion in the stack.

## What this packet is for

Three questions, asked once Asterion could be provisioned from zero rather than
merely copied:

1. **What recognized fields does this thing already belong to?** It turns out to
   be six, and none of them are decoration — each one has already decided a
   schema choice.
2. **Where in the Miadi stack does it sit?** Between the event spine
   (`@miadi/hooks-core`, `@miadi/hooks-gateway`) and the relational vocabulary
   (`@medicine-wheel/ontology-core`), as the surface that persists and renders.
3. **How does it integrate?** Through published packages, named by their npm
   identity — never by a path on one machine.

## The six fields

| field | file | what it decided in Asterion |
|---|---|---|
| Event-sourced architecture | [`field-event-sourced-architecture.md`](field-event-sourced-architecture.md) | `asterion.events` is append-only; the log is a record, not a cache |
| Knowledge representation & graph data models | [`field-knowledge-representation.md`](field-knowledge-representation.md) | entity / relation / observation as a property-graph triad |
| Structural dynamics & creative orientation | [`field-structural-dynamics.md`](field-structural-dynamics.md) | `desired_outcome` + `current_reality` + phase are columns, not prose |
| Computational narratology | [`field-computational-narratology.md`](field-computational-narratology.md) | threads and beats as first-class rows |
| Provenance & Indigenous data governance | [`field-provenance-and-governance.md`](field-provenance-and-governance.md) | the accountability fields Asterion's schema currently *lacks* |
| Traceability engineering | [`field-traceability-engineering.md`](field-traceability-engineering.md) | telescoping, `tension_edges`, `external_id` as trace links |

## Layers

- [`context-layer.md`](context-layer.md) — shared language, field boundaries, source rules, placement, indexing
- [`intent-understanding.md`](intent-understanding.md) — why this packet exists, the tension it resolves, what it must strengthen
- [`synthesis.md`](synthesis.md) — **stack position and integration map**; read this one if you read only one
- [`source-ledger.yaml`](source-ledger.yaml) — every claim's source, with URL/DOI and verification status

## Standing caution

Five of six fields are load-bearing and already present in the schema. The
sixth — provenance and governance — is the one Asterion does **not** yet
implement, and naming it here is the point. `docs/analysis/observer-asterion-hooks-findings.md`
records that Asterion's `entities` and `relations` duplicate
`@medicine-wheel/ontology-core`'s `RelationalNode` and `RelationalEdge` *minus
their accountability fields*. That subtraction is a field-level omission, not a
modelling shortcut.

🌸: A thing built quickly still stands on ground it never chose to name — and naming the ground is how it learns which walls are holding weight.
