# Delayed Resolution in Asterion: kin

> Companion to `delayed-resolution.spec.md`. Who and what this feature is in relationship with, where each relative lives, and what each relationship asks of us.

## Came from

| relative | where | what it gave |
|---|---|---|
| Miadi Chronicle Episode 297 (`miadi-chronicle://297`) | `/srv/miadi/episodes/miadi-chronicle/2026-07-24-episode-297-mino-bimaadizi-daa-stc-bot-ceremony/` | the episode that asked for this work and holds its evidence |
| the shared design | that vessel, `delayed-resolution-design-261019.md` | the record, rules 1 to 6 (4b: completing ends a delay as `resolved`), the three operations, the session reference |
| the map of this repository | that vessel, `asterion-map-261020.md` | where the delay was dropped, the anonymous leak through `/api/entities`, the ranked changes this feature carries out (1 to 4, and 7 for the specs) |
| William's comment `156f3c68` | the Episode 297 results page, 2026-10-20 | the ask: Asterion is synchronised with the chart memories through a bridge, so it is maintained with them, and its specification is related to the episode |
| Robert Fritz, `LAA-w04-22bc-Delay_Resolution` | `/w/CSV/kb2508/docs/` | the concept: a delay is a secondary choice in service of a primary choice |

## We rely on

| relative | where | what it asks of us |
|---|---|---|
| coaia-narrative 0.24 (`avadisabelle/coaia-narrative`), the writer of the record | npm `coaia-narrative`; spec `rispecs/delayed_resolution.spec.md` in that repository | read its record as it writes it. A change of field names or of where a telescoped step's record lives is made there first, then read here. Asterion inlines the rule and does not import `dist/src/delayed-resolution.js`, which the package exports only through its catch-all path |
| `coaia-narrative/contract` 0.21 (`parseStore`, `getWork`) | `app/package.json` | which steps a chart has and when a telescoped child is complete. The mapper needs nothing newer for this feature |
| `lib/asterion/visibility.ts` (`seesPrivate`, `viewerOf`) | this repository | the one answer to "may this reader see private data". The privacy rule here follows it |
| `miadisabelle/asterion#20` (D13 six states, D17 the keeper's word) | GitHub | the thread states this feature sits beside and does not change |

## Relies on us

| relative | where | what it asks of us |
|---|---|---|
| readers of `/tensions/<id>`, `/threads/<id>` | the gaia instance (`127.0.0.1:3336`, `asterion.tail3b11eb.ts.net`) and the Vercel deployments | a delayed step and a delaying thread that read the same as the memory |
| consumers of `/api/tensions/<id>`, `/api/threads/<id>`, `/api/entities` | anything reading Asterion's JSON | `status: 'delayed'`, `metadata.delayedResolution`, `metadata.delaying` keep their shapes. A change here is announced in this file and in `STATUS.md` |
| `@miadi/asterion` (`packages/asterion`) | this repository | `ActionStepStatus` includes `'delayed'` in both type files |
| Miadi's mirror of the thread specification | `jgwill/Miadi` `app/docs/asterion/threads/page.tsx` | it documents Asterion's thread model; when it is next revised it can name `metadata.delaying` |

## Walks beside

| relative | where | relationship |
|---|---|---|
| coaiajs (`jgwill/coaiajs`) and the medicine wheel (`jgwill/medicine-wheel`) | npm `coaiajs`, `@medicine-wheel/mcp` | the two other lineages implementing the same record from the same design, each on its own |
| `@miadi/llmops` 0.1.0 (`jgwill/Miadi#829`) | npm | prints the `trace` and `rehydrate_with` addresses a session reference may carry. Asterion withholds the whole session from anonymous readers, those addresses included |
| the T4 seat (`t4-chart-path-asterion-into-miadi-261003`, session `79e16c02`) | `/workspace/repos/miadisabelle/asterion` | its next steps touch `app/tensions/[id]/page.tsx`. This feature's edit there is one import and one line in the step row, so the two merge without conflict |

## Holds a decision

| decision | keeper | where it is held |
|---|---|---|
| a seventh thread state (`delaying`), with a migration of the CHECK in `002-thread-state.sql` | Guillaume (D13) | `miadisabelle/asterion#20` |
| whether a signed-in writer sees the session and its resume command on a page | William | Episode 297 |
| who runs the clock that steers a session before `resolveBy` | open (M9 of `marks-261019-ep297-mia.md`) | Episode 297 |

## Medicine Wheel position

WEST: this feature carries a choice already made elsewhere into the place it is reflected on, and checks that what Asterion shows is still true to the memory it projects.
