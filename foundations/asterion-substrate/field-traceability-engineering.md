# Field 6 — Traceability engineering

**Governs:** how a claim is followed to its origin.
**Does not cover:** the record of change itself (field 1).

## Canonical concepts

- **Requirements traceability**, in Gotel & Finkelstein's still-standard 1994 definition (*An Analysis of the Requirements Traceability Problem*, ICRE '94, DOI 10.1109/ICRE.1994.292398): the ability to describe and follow the life of a requirement in both forward and backward directions — from its origins, through development and specification, to deployment and use, and through all ongoing refinement.
- **Pre- vs post-requirements traceability.** The 1994 paper's durable contribution: most traceability failures are *pre-*requirements — the link back to who wanted this and why is what gets lost, not the link forward to code.
- **Trace links are typed.** "Related to" is not traceability. A link that does not say *how* one artifact bears on another cannot be validated or maintained, and decays into noise.
- **Traceability decays without a producer.** The systematic-review literature is consistent: links maintained by hand rot; links emitted as a by-product of work survive.

## Where Asterion already commits

- `action_steps.telescoped_to_tension_id` — an action step decomposing into its own chart, **with the parent relation preserved**. This is a backward trace link in Gotel & Finkelstein's exact sense, and it is the schema's sharpest single idea.
- `tension_edges` — a typed edge table between tensions, traversed by `getTensionGraph`'s recursive CTE.
- `doc_links` — a link table with eight distinct target columns (`to_tension_id`, `to_entity_id`, `to_event_id`, `to_layer_id`, `to_project_id`, `to_thread_id`, `to_page_id`, `to_github_ref`) plus `link_type`. Typed traceability from documentation into every other surface.
- `entities.external_id` / `external_source` — the seam for tracing an entity back to its origin in another system.
- `doc_revisions` — the history of a section, forward traceability over documentation.

## Cautions

- **`doc_links` has zero rows. `entities` has zero rows. `external_id` has never been populated.** The most complete traceability apparatus in the system is entirely unexercised — which is exactly the decay mode the literature predicts for hand-maintained links: they are not maintained because nothing emits them.
- **`to_github_ref` is free text.** Cross-repo references need the full `owner/repo#number` form; a bare `#number` resolves against the wrong repository. The column permits either.
- The `@miadi/asterion` / `app/lib/asterion/types.ts` duplication is itself an untraced link: two copies of 295 lines with nothing recording that they must agree.

## Engineering implications

1. **`external_id` / `external_source` is the designated seam** for `@miadi/hooks-gateway` 0.1.0 to attach ingested artifacts. It was built for this and is empty; connecting it is the smallest change that makes traceability real rather than latent.
2. **Emit links, do not curate them.** A hook that fires on an event and writes a typed `doc_links` row will outlive any convention asking humans to add them.
3. **`@miadi/plan-insight` 0.3.1 and `@miadi/inquiry-weave` 0.6.6** already reason over plan structure and episode lineage respectively. Asterion's edges should reference their identifiers rather than mint parallel ones.
4. Constrain `to_github_ref` to `owner/repo#number`, or validate on write.

## Sources

`gotel-finkelstein-1994`, `pre-rs-traceability-slr-2023`, `ir-traceability-mapping-2025` — see [`source-ledger.yaml`](source-ledger.yaml).
