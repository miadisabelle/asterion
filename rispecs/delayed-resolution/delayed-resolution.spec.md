# Delayed Resolution in Asterion
## RISE specification: a chosen delay on a step, carried from the chart memory to the page

**Purpose**: A step someone chose to wait on reaches Asterion as a step that says so: until when resolution is wanted, how many days remain or that it is owed, why the wait was chosen, what it serves, and which events wake it. The chart thread that holds the step says it is delaying resolution. The agent session the delay would rehydrate stays with signed-in writers.

**Origin**: Miadi Chronicle Episode 297 (`miadi-chronicle://297`), vessel `2026-07-24-episode-297-mino-bimaadizi-daa-stc-bot-ceremony/`:
- the design shared by three lineages, `delayed-resolution-design-261019.md` (the record, rules 1 to 6, outcomes `rehydrated | released | resolved`);
- the read-only map of this repository, `asterion-map-261020.md` (items 1 to 4 and 7 of its ranked changes);
- William's comment `156f3c68` on the Episode 297 results page (2026-10-20): Asterion is synchronised with the chart memories through a bridge, so it needs the same care, and its specification is related to the episode.

The thread states it sits beside are `miadisabelle/asterion#20` (D13 six states, D17 the keeper's word).

**Status**: see `STATUS.md`.

---

## Desired Outcome

For every chart projected from a coaia-narrative memory:

1. Each step carrying an open delay is stored with status `delayed` and the public part of its record, and its row on `/tensions/<id>` reads "delayed until <day> · in n days" (or "· owed"), the reason, what the wait serves, the wake cues, and the step's due date.
2. A step whose delay ended keeps how it ended (`outcome`, `endedAt`, `endedBy`) and returns to `pending`.
3. A chart thread whose family carries an open delay holds `metadata.delaying`, and `/threads/<id>` reads "Delaying Resolution until <day>" beside its state, with "owed" once that day has passed.
4. The thread's `state` and `state_note` remain exactly what the root chart's keeper wrote.
5. A reader who is not a signed-in writer never receives a delay's `session` from any route: the whole object, whatever it carries (host, directory, tmux pane, resume command, inventory record, and the `trace` and `rehydrateWith` addresses the design added on 2026-10-20).

## Current Reality (at `cc8b31b`, 2026-10-20)

- coaia-narrative 0.24 writes `delayedResolution` and `delayedResolutionHistory` into a step's metadata. Asterion copied them, unchanged, into `asterion.entities.metadata` only.
- The `action_steps` row the pages read was rebuilt from a fixed list (`dueDate`, `telescopedToChartId`, `source`, `github`), so the delay was dropped and the status was `completed` or `pending`.
- No page showed a step's due date.
- `GET /api/entities` returned full entity metadata for public projects to anonymous readers, the delay's `session` included.
- A thread's state came from its root chart's status word, and nothing in the thread said that one of its steps was waiting by choice.

## Structural Tension

A chosen delay is a secondary choice in service of a primary one (Fritz, `LAA-w04-22bc-Delay_Resolution`). Asterion is where the factory's charts are walked in a browser. While the browser shows a delayed step as an unexplained pending step, the choice exists in the memory and nowhere a person looks. The desired outcome above is what the projection and the pages hold once the choice travels with the step, and the privacy rule is what lets it travel to public projects.

---

## Natural Language: Functional Aspects

### The record, as Asterion reads it

The rule is inlined in `app/lib/asterion/delayed-resolution.mjs`. Asterion does not import the writer's internals; it reads the record and keeps its own lineage.

- A **delay record** is an object in metadata at `delayedResolution` with a string `resolveBy`.
- It is **open** while it has no `endedAt`.
- Earlier records sit in `delayedResolutionHistory`, an array, oldest first.
- Fields read: `chosenAt`, `chosenBy`, `resolveBy`, `reason`, `primaryChoice`, `wakeOn` (strings), `session`, `endedAt`, `endedBy`, `outcome`, `endNote`.

### Where a step's delay is read (mapper, `coaia-projection.mjs`)

| step | where its record lives |
|---|---|
| written step (`action_step` entity) | its own metadata |
| telescoped step (`telescope:<childId>`, a child chart no flat step stands for) | `<childId>_desired_outcome` |
| flat step that opened into a child chart | its own metadata first, then `<childId>_desired_outcome` |

### Status

`completed` wins (the step's `completionStatus`, or for a telescoped step the contract's completion of its child). Otherwise `delayed` while the record is open, otherwise `pending`.

### What the step row carries

`metadata.delayedResolution` holds the public subset: `resolveBy`, `chosenAt`, `chosenBy`, `reason`, `primaryChoice`, `wakeOn`, and once ended `endedAt`, `endedBy`, `outcome`, `endNote`. `metadata.delayedResolutionHistoryCount` holds how many earlier delays the step carried. **The session is never copied.**

Both keys are added only when the step carries a record. A chart with no delay keeps the content hash it had before mapper version 9, so the upgrade logs no `tension.projected` event for it.

`MAPPER_VERSION` is 9, so every registered project re-projects on its next sync pass.

### The chart thread

In the threads loop, a family whose steps include any with status `delayed` gets:

```text
metadata.delaying = {
  resolveBy   the earliest resolveBy among its open delays
  owed        whether any of them had passed at asOf
  asOf        the plan's now (ISO)
  steps       [{ step, chartId, title, resolveBy }], earliest first
}
```

- A completed step or an ended delay does not count.
- `state` and `state_note` are not touched (D17). No seventh state is introduced (D13 stands).
- `owed` is true as of the pass that wrote it. The registry sync skips files whose bytes have not moved, so a page computes owed again from `resolveBy` when it renders.
- `planProjection(input, { file, now })` takes `now` for this, as `planCircleProjection` does. No hash depends on it.

### Privacy

`getEntities` (`GET /api/entities`) removes `delayedResolution.session` and every `delayedResolutionHistory[].session` from each entity unless `seesPrivate(viewer)`. The whole `session` object goes, so a field the session reference gains later is withheld without a change here. The row read from the database is not changed. An entity without a session passes through as it is (`publicEntity`).

### Display

- `components/asterion/badges.tsx`: `DelayBadge` ("delayed until <day> · in n days", "· today", "· owed") and `StepDelay` (the badge, the step's due date, the reason as "Why wait", the primary choice as "Serves", the wake cues as "Wake on", and for an ended delay "delay ended <day> · <outcome>").
  - The due date is said once: when a delay is open and its day equals the due date (rule 1 of the design), only the badge shows it.
  - Days are UTC days, counted up, as coaia-narrative counts them.
- `app/tensions/[id]/page.tsx`: one `StepDelay` per step row, under the description.
- `app/threads/[id]/page.tsx`: the "Delaying Resolution until <day>" chip beside the state, with "owed" and the step count, and each delayed step's title and day in its title text.

### What this specification does not do

- A seventh thread state such as `delaying`. That needs a migration of the CHECK in `002-thread-state.sql` and an amendment of D13 by its keeper.
- A delay badge on the chart itself (tension metadata, `tension-card.tsx`).
- Showing the session or its resume command to signed-in writers on a page.
- Writing a delay from Asterion. Asterion projects the memory and writes nothing back.
- The clock that steers a session before `resolveBy`.

---

## Creative Advancement Scenarios

**Creative Advancement Scenario**: The keeper sees what waits, and why

**User Intent**: William opens a chart on Asterion and sees which steps were chosen to wait and what each wait serves.
**Current Reality**: A step was delayed through coaia-narrative's `delay_resolution`; the memory carries the record.
**Natural Progression Steps**:
  1. The sync pass projects the memory with mapper version 9, and the step's row carries status `delayed` and the public record.
  2. The tension page renders the row with "delayed until 2026-11-02 · in 13 days", the reason, what it serves and the wake cues.
  3. When the day passes, the same row reads "owed" without another pass.
**Achieved Outcome**: The choice to wait is visible where the chart is read, with its date and its purpose.
**Supporting Features**: the mapper's step mapping, `StepDelay`, `DelayBadge`.

**Creative Advancement Scenario**: A thread says it is delaying resolution

**User Intent**: A reader following a chart thread knows that part of its family is waiting by choice.
**Current Reality**: The thread's state is `active`, written by the root chart's keeper.
**Natural Progression Steps**:
  1. The mapper finds the family's open delays and writes `metadata.delaying`, earliest first.
  2. The thread page shows "Delaying Resolution until 2026-10-25" beside `active`.
  3. When the last delay ends or its step completes, the next pass writes the thread without `delaying`.
**Achieved Outcome**: The thread reads as active and delaying at once, and the keeper's word is unchanged.
**Supporting Features**: the threads loop, `threadDelayingOf`, the thread page chip.

**Creative Advancement Scenario**: The session stays with the writers

**User Intent**: A public project's graph can be read by anyone without exposing where an agent's work is resumed.
**Current Reality**: A delay names its session's host, directory, tmux pane and resume command.
**Natural Progression Steps**:
  1. The step row never receives the session.
  2. `GET /api/entities` removes every delay session for a reader who is not a signed-in writer.
  3. A signed-in writer still receives the whole record.
**Achieved Outcome**: The delay is public where its project is public, and its session is not.
**Supporting Features**: `publicDelay`, `publicEntity`, `seesPrivate`.

---

## Checks that hold this specification

- `app/tests/coaia-projection.test.mjs`: an open delay on a written step, an ended delay, completed over delayed, a telescoped delay, the thread's `delaying` (earliest first, owed by `now`, state untouched), and the write path (step rows and thread metadata as written, no session in any step row).
- `app/tests/delayed-resolution.test.mjs`: `publicEntity`, `getEntities` for an anonymous reader and for a writer, and the `StepDelay` render.
