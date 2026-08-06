# Field 3 — Structural dynamics & creative orientation

**Governs:** what a unit of work *is*.
**Does not cover:** how a sequence of units carries meaning (field 4).

## Canonical concepts

- **Structure determines behaviour.** Fritz's central claim: the underlying structure of an organization — or a life, or a system — determines its behaviour, and the way out of an unwanted pattern is to change the structure, not to try harder inside it.
- **Structural tension.** The relationship between a clearly held desired result and an accurately seen current reality. The discrepancy is a *dynamic force seeking resolution* — generative, not pathological. This is why the language matters: a step **resolves tension**; it does not "close a gap." Gap-language reframes a generative force as a defect and quietly reinstates problem-solving.
- **Advancing vs oscillating patterns.** In an advancing pattern each accomplishment becomes the platform for the next. In an oscillating pattern success is followed by reversal — motion without progress. Both are structural outcomes, not motivational ones.
- **Managerial Moment of Truth (MMOT).** Bodaken & Fritz's four-step protocol for facing reality about performance: acknowledge what happened, analyse how it happened, create an action plan, establish a feedback system. Reported at Blue Shield of California as adding 25–40% to organizational capacity.

## Where Asterion already commits

This field is not an interpretive lens applied to Asterion — it is in the DDL. `asterion.tensions` carries `desired_outcome` and `current_reality` as sibling columns, with `phase` constrained to `germination → assimilation → completion` and indexed (`idx_tensions_phase`). `action_steps` hang off a tension and carry `telescoped_to_tension_id`. `mmot_evaluations` is its own table.

A schema that makes `desired_outcome` and `current_reality` peer columns has taken a position: the unit of work is a *tension*, not a *task*.

## Cautions

- **`mmot_evaluations` has zero rows.** The table encodes the protocol; nothing has exercised it.
- **Phase is not enforced as a state machine.** `phase` is a text column with a default; nothing prevents `completion → germination`. Fritz's phases describe a directional progression, and the schema currently only records which one is claimed.
- The vocabulary is legible to `@medicine-wheel/ontology-core` 0.5.8, whose `TensionPhase` is the identical enumeration — see field 2.

## Engineering implications

1. If phase order carries meaning, either enforce it or emit an event when it is violated. `@medicine-wheel/narrative-engine` 0.5.8 ships `enforceDirectionOrder: false` by design — advising rather than policing — and that precedent is available here.
2. MMOT is the natural consumer of the event log: an evaluation is a reading *over* what happened, which is exactly what an append-only log is for.
3. Guard the language in generated text and UI copy. "Bridge the gap" in a tooltip undoes the schema's position.

## Sources

`fritz-polr`, `fritz-polr-managers`, `bodaken-fritz-mmot`, `systems-thinker-polr`, `thwink-structural-tension` — see [`source-ledger.yaml`](source-ledger.yaml).
