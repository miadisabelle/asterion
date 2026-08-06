# Field 1 — Event-sourced architecture

**Governs:** how state changes are recorded.
**Does not cover:** how artifacts link to each other (field 6), or who may read a record (field 5).

## Canonical concepts

- **Event sourcing.** The event log is the primary record of the system. The defining test, from Fowler's 2005 formulation: at any time you can discard application state and rebuild it confidently from the log. If you cannot, you have an audit trail, not an event-sourced system.
- **CQRS.** Command Query Responsibility Segregation, named by Greg Young: the model that writes is not the model that reads. It composes with event sourcing because a projection is cheap to rebuild when the log is authoritative.
- **No logic between event and store.** Young's caution: business logic sitting between an event and its persistence creates versioning tangles that make replay after a bug fix unsound.
- **Append-only as a semantic, not a constraint.** The value is not immutability for its own sake; it is that the sequence of what happened remains inspectable after the derived state has moved on.

## Where Asterion already commits

`asterion.events` is append-only by construction: `{id, event_type, actor_type, actor_id, tension_id, payload jsonb, created_at}` with `idx_events_created` on `created_at DESC`. `POST /api/events` is a pure append — no update or delete path exists. `logEvent` is called on tension creation, project creation, and action-step creation. The Redis layer carries `pushEvent` / `popEvent` / `getQueueLength` queue helpers.

## Cautions

- **Asterion is not currently event-sourced — it is event-*logging*.** State lives in `asterion.tensions` etc. and the log is written *alongside* it, not projected *from* it. Discarding the tables and replaying `events` would not reconstruct the system. That is a legitimate design, but it should be stated rather than assumed, because the phrase "append-only event log" invites the stronger reading.
- **`actor_type` and `actor_id` are nullable and, in the live instance, null on every row.** An event with no actor cannot answer field 5's question.
- The Redis idempotency and lock helpers exist with **zero callers** — the machinery for exactly-once ingestion is present and unwired.

## Engineering implications

1. Decide explicitly whether the log is *the* record or *a* record. If the former, projections must be derivable and `db-provision.mjs` gains a rebuild path.
2. `@miadi/hooks-gateway` is the natural producer. Its ledger and Asterion's `events` table are two logs; one of them should be the projection of the other, not a parallel truth.
3. Populate `actor_type` / `actor_id` before volume arrives — retrofitting attribution onto an append-only log is the one thing append-only makes hard.

## Sources

`fowler-event-sourcing`, `fowler-cqrs`, `young-cqrs-docs`, `msft-event-sourcing` — see [`source-ledger.yaml`](source-ledger.yaml).
