# Field 5 — Provenance & Indigenous data governance

**Governs:** who may know, and who answers for it.
**Does not cover:** the structure being governed (field 2), or how a claim is followed to origin (field 6).

**This is the field Asterion does not yet implement. Naming it is the point.**

## Canonical concepts

- **W3C PROV-O** (Recommendation, 30 April 2013). Expresses the PROV data model in OWL2 around three classes — **Entity** (a thing with fixed aspects), **Activity** (something acting upon or generating entities over time), and **Agent** (something *responsible for* an activity or entity) — related by `wasGeneratedBy`, `used`, `wasAssociatedWith`, `wasDerivedFrom`. Provenance is defined as information about entities, activities and people involved in producing a thing, usable to assess its quality, reliability or trustworthiness.
- **OCAP®** — the First Nations principles of **Ownership, Control, Access and Possession**, established 1998 by Canadian First Nations leadership, a trademark of the First Nations Information Governance Centre. Ownership: a community owns its information collectively as an individual owns their personal information. Control: First Nations are within their rights seeking control over every stage of research and information management affecting them. Access: how data will be collected, protected, used, shared. Possession: physical stewardship, the mechanism by which ownership is asserted.
- **Relational accountability** — Wilson, *Research Is Ceremony: Indigenous Research Methods* (Fernwood, 2008, ISBN 9781552662816). Knowledge is not owned by an individual but held in relationship; research is the ceremony of maintaining accountability to those relations. Methodology starts from the Indigenous paradigm and borrows Western tools, not the reverse.

## Where Asterion stands

`asterion.events` has `actor_type` and `actor_id` — PROV's Agent, in outline. Every row in the live instance has them **null**.

There is no consent record, no access scope, no ownership field, and no accountability structure anywhere in the eighteen tables. `docs/analysis/observer-asterion-hooks-findings.md` states the finding precisely: Asterion's `Entity` and `Relation` reproduce `@medicine-wheel/ontology-core`'s `RelationalNode` and `RelationalEdge` **with the accountability fields removed**.

That is not an oversight to patch quietly. A v0 draft, generating a schema from a prompt, produced exactly the subtraction this field exists to name — the relational obligations dropped because they are not what a code generator optimizes for.

## Cautions

- **This field is not satisfied by adding columns.** OCAP® is about who decides, not where a boolean lives. A `consent` column with no governance behind it is worse than none, because it looks discharged.
- Asterion currently holds one contributor's working content, including personal material (a tension about a painting). Multi-tenant deployment across `jgwill.com` / `sanctuaireagentique.com` / `tushell.com` changes the question from private notes to *someone else's data*.
- The published stack already carries this field: `@medicine-wheel/consent-lifecycle`, `@medicine-wheel/ceremony-protocol`, `@medicine-wheel/community-review`, `@medicine-wheel/fire-keeper`, `@medicine-wheel/transformation-tracker` (all 0.5.8). Asterion reimplementing any of it would be the same subtraction repeated.

## Engineering implications

1. **Populate `actor_type` / `actor_id` before volume.** Attribution is the one thing an append-only log makes hard to retrofit.
2. **Adopt rather than reimplement.** `@medicine-wheel/consent-lifecycle` and `@medicine-wheel/ceremony-protocol` 0.5.8 are published; the integration is a dependency, not a design.
3. **The `observations` table is the attachment point** for PROV-style `wasDerivedFrom` / `wasAttributedTo` without restructuring the graph.
4. **Governance decisions are not an engineer's to settle.** Which data is whose, and under what consent, is held by the people accountable for it. This packet names the field; it does not resolve it.

## Sources

`w3c-prov-o`, `fnigc-ocap`, `fnigc-ocap-brochure`, `wilson-2008`, `ocap-springer-2024` — see [`source-ledger.yaml`](source-ledger.yaml).
