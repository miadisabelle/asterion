# Field 4 — Computational narratology

**Governs:** how a sequence carries meaning.
**Does not cover:** what an individual unit of work is (field 3).

## Canonical concepts

- **Narrative as a computational object.** Computational narratology treats story structure as something a system can represent, analyse and generate — not merely display. Alhussain & Azmi's *Automatic Story Generation: A Survey of Approaches* (ACM Computing Surveys 54(5), 2021, DOI 10.1145/3453156) is the standard entry point; Kybartas & Bidarra's taxonomy separates narrative *analysis* from *generation*, which is the distinction that matters for a system that mostly records.
- **Beats.** The smallest unit of narrative change — a moment where the situation is not what it was. Beat sequencing is how a system reasons about pacing and consequence rather than mere chronology.
- **Event-based narrative extraction.** A recognized subfield concerned with recovering narrative threads from event streams (see the 2023 survey on event-based news narrative extraction). This is precisely the shape of a system that has both an event log and a thread table.
- **The ordering distinction.** Chronology is what happened when; narrative is what follows from what. A timestamp gives the first for free and the second never.

## Where Asterion already commits

`asterion.narrative_threads` and `asterion.narrative_beats` are first-class tables, with `thread_tensions` joining threads to structural tensions. Beats carry `tension_id`. The `/threads` route and `/api/threads` render them.

Declaring beats as rows — rather than deriving a timeline from `events.created_at` — is a commitment: sequence is authored, not merely observed.

## Cautions

- **Both tables are empty in the live instance.** The most theoretically interesting surface in Asterion has never held a row. Nothing has been learned from it yet.
- Asterion has *two* orderings — `events.created_at` and beat sequence — with no stated relationship. Field 1's log and field 4's thread will disagree eventually; which one a reader is looking at should be unambiguous.
- `@medicine-wheel/narrative-engine` 0.5.8 already implements beat sequencing in a directional spiral with alignment scoring. Asterion should consume it or state why it does not.

## Engineering implications

1. `@medicine-wheel/narrative-engine` 0.5.8 is the published implementation of this field in the Miadi stack. The integration question is whether Asterion persists *for* it or duplicates it.
2. Beat-from-event derivation is the obvious first experiment now that the write path works: a producer emits events, a projection proposes beats, a human authors the thread. That sequence keeps generation subordinate to authorship.
3. `@miadi/inquiry-weave` 0.6.6 already carries episode-to-episode lineage; threads spanning episodes should reference it rather than reinvent the edge type.

## Sources

`alhussain-azmi-2021`, `kybartas-bidarra-2017`, `news-narrative-2023`, `narrative-llm-survey-2026` — see [`source-ledger.yaml`](source-ledger.yaml).
