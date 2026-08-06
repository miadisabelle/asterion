# Context layer — asterion-substrate

**Date:** 2026-08-06 · **Packet:** `asterion-substrate` · **Repo:** `miadisabelle/asterion`

## Shared language

| term | meaning here | not to be confused with |
|---|---|---|
| **event** | a row in `asterion.events`, append-only, `{event_type, actor_type, actor_id, tension_id, payload, created_at}` | a React event, or a webhook payload in flight |
| **hook** | in this repo, a React hook (`lib/asterion/hooks.ts`, SWR wrappers). The *lifecycle* hooks live in `@miadi/hooks-core` | the two senses collide in conversation constantly; always qualify |
| **structural tension** | Fritz's dynamic relationship between `current_reality` and `desired_outcome`; it is a generative force, not a defect | a "gap" to be closed. Steps **resolve tension**; they do not bridge gaps |
| **phase** | `germination → assimilation → completion` | project status. `@medicine-wheel/ontology-core` calls the identical thing `TensionPhase` |
| **telescoping** | recursive decomposition of an action step into its own chart, lineage preserved (`telescoped_to_tension_id`) | subtasking, which discards the parent relation |
| **entity / relation / observation** | Asterion's property-graph triad | `@medicine-wheel/ontology-core`'s `RelationalNode` / `RelationalEdge`, which carry accountability fields Asterion's do not |
| **MMOT** | Managerial Moment of Truth — a four-step truth-telling and correction protocol (Bodaken & Fritz) | a generic retrospective |

## Field decomposition (MECE)

Six fields, mutually exclusive by *what they govern*, collectively exhaustive of
what Asterion's schema commits to:

1. **Event-sourced architecture** — governs *how state changes are recorded*
2. **Knowledge representation & graph data models** — governs *how things and their links are shaped*
3. **Structural dynamics & creative orientation** — governs *what a unit of work is*
4. **Computational narratology** — governs *how sequence carries meaning*
5. **Provenance & Indigenous data governance** — governs *who may know, and who answers for it*
6. **Traceability engineering** — governs *how a claim is followed to its origin*

Boundaries that keep them exclusive:

- (1) is about **the record of change**; (6) is about **the link between artifacts**. An append-only log is not a trace link.
- (2) is about **structure**; (5) is about **permission and accountability over that structure**. `@medicine-wheel/ontology-core` deliberately fuses them; Asterion currently implements only (2).
- (3) is about **the shape of a work item**; (4) is about **the shape of a sequence of them**.

## Source quality rules

- Prefer: peer-reviewed papers with DOIs, W3C Recommendations, standards bodies, and the primary source for a named practice (FNIGC for OCAP®, Fritz for structural tension).
- Accept: strong practitioner engineering writing where the field's vocabulary originated there rather than in academia (Fowler on event sourcing, Young on CQRS) — flagged as `practitioner` in the ledger.
- Reject: secondary summaries, blog restatements, and retailer pages standing in for a work. Book entries cite publisher or ISBN, not a storefront.
- Every entry in `source-ledger.yaml` carries `verified: true|false`. `true` means the URL was fetched or returned in live search on 2026-08-06.

## Placement and federation

- **Repo-local.** This packet lives in `miadisabelle/asterion` because that is where the schema decisions it explains are made and consumed.
- **Crosswalk owed.** The provenance/governance field (5) describes an alignment path toward `@medicine-wheel/ontology-core`. If the medicine-wheel side maintains a registry, it should reference this packet rather than restate it.
- **QMD.** Indexable as-is; the field files are self-contained and each names its own boundaries, so partial retrieval does not mislead.
- **Adjacent artifacts in this repo:** `docs/analysis/observer-asterion-hooks-findings.md` (the 2026-08-05 findings of record), `docs/analysis/ceremony-event-architecture.html`, `app/db/schema.sql` (the 18-table surface these fields decided).

## Provenance of the packet itself

Written 2026-08-06 in the session that made Asterion provisionable from zero:
schema introspected out of the live Neon instance, a `db-provision.mjs` verified
against a throwaway schema, and `/api/graph` fixed after never once returning
200. The fields below were identified *after* that work, by reading what the
schema had already committed to — not chosen in advance and imposed.
