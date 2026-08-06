# Field 2 — Knowledge representation & graph data models

**Governs:** how things and their links are shaped.
**Does not cover:** permission or accountability over that structure (field 5).

## Canonical concepts

- **Property graph vs RDF.** A property graph is a directed labeled graph in which vertices and edges each carry arbitrary property–value pairs. RDF supports a richer hierarchy of datatypes, identifiers and inference rules and is the more expressive of the two. Angles & Gutiérrez's *Survey of graph database models* (ACM Computing Surveys 40(1), 2008) is the founding comparative treatment; Hogan et al.'s *Knowledge Graphs* (ACM Computing Surveys 54(4), 2021) is the current synthesis.
- **Entity–relation–observation.** The pattern of attaching timestamped, sourced statements *about* an entity rather than mutating the entity's own fields. It keeps the assertion separable from the thing asserted — which is what makes provenance attachable later.
- **Schema-on-read tension.** `jsonb` metadata columns buy flexibility at the cost of queryability and of any guarantee that two writers mean the same thing by a key.

## Where Asterion already commits

Asterion implements a property graph in Postgres: `entities`, `relations`, `observations`, plus `tension_edges` for the tension-to-tension layer. `getTensionGraph` traverses it with a recursive CTE. Every table carries a `metadata jsonb DEFAULT '{}'` escape hatch. `@xyflow/react` is declared for visualization.

`@miadi/asterion` 0.1.0 publishes this shape as types — the contract as a consumable artifact rather than an implementation detail.

## Cautions

- **The duplication is the finding.** `docs/analysis/observer-asterion-hooks-findings.md` records that Asterion's `Entity` / `Relation` are `@medicine-wheel/ontology-core`'s `RelationalNode` / `RelationalEdge` **minus the accountability fields**, and that Asterion's `Phase` is exactly ontology-core's `TensionPhase`. Two vocabularies for one concept, published separately, will drift.
- `@xyflow/react` is a declared dependency **used nowhere** in the codebase.
- The app does not consume `@miadi/asterion`; `types.ts` exists identically in both the library and `app/lib/asterion/`. Field 6 makes this expensive, not merely untidy.

## Engineering implications

1. Treat `@medicine-wheel/ontology-core` 0.5.8 as the vocabulary of record and Asterion's tables as a *persistence profile* of it — or state deliberately that they are separate models with a mapping. Silence is the one option that guarantees drift.
2. The `observations` table is where provenance attaches without schema churn. Field 5 depends on it.
3. Before `metadata jsonb` accumulates meaning, decide which keys are contractual and promote them to columns.

## Sources

`angles-gutierrez-2008`, `hogan-kg-2021`, `w3c-prov-o` — see [`source-ledger.yaml`](source-ledger.yaml).
