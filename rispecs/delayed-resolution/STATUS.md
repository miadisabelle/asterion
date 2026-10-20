# Delayed Resolution in Asterion: status

**Specification**: `delayed-resolution.spec.md` · **Kin**: `delayed-resolution.kin.md`
**Episode**: Miadi Chronicle 297 (`miadi-chronicle://297`) · **Threads**: `miadisabelle/asterion#20`
**As of**: 2026-10-20

## Stages, each stated separately

| stage | state | proof |
|---|---|---|
| implemented | yes, commit `46f038a` | mapper version 9, `lib/asterion/delayed-resolution.mjs`, `getEntities`, `StepDelay`, the thread chip, both type files |
| tested | yes | `cd app && pnpm test`: 35 tests, 34 pass, 1 skipped (the database test, which needs `ASTERION_DB_TEST=1`), 0 fail |
| typechecked | no new error | `npx tsc --noEmit -p .` in `app/`: the same 11 errors as `cc8b31b`, none in the files this feature touches |
| gates | pass | `node scripts/check-write-gates.mjs` (21 write handlers) and `node scripts/check-read-gates.mjs` (12 read handlers), both exit 0 |
| checked on real data | yes, read-only | `planProjection` on Episode 297's `stc/ep297-delays.jsonl`: 6 steps `delayed`, 3 ended delays carried with their outcome, 2 completed steps `completed`, no session in any step row. That memory has no beats, so it draws no thread |
| on `main` | see `git log origin/main` | |
| deployed on gaia | **no** | nothing in this folder says it is live until the steps below are run and read back |

## Deploying (not done)

1. The live checkout `/workspace/repos/miadisabelle/asterion` fast-forwards to `origin/main`.
   - The 5-minute `asterion-coaia-sync.timer` runs the mapper from that working tree, so from its next pass every registered project re-projects with mapper version 9 (the sync treats a new `MAPPER_VERSION` as a change). The data moves before any rebuild.
   - Projects fed through the door (ep060) re-project on their writer's next post.
2. From the live checkout: `./scripts/ops/rebuild.sh`, then `./scripts/ops/status.sh`.
   - Until the rebuild, the running build still serves delay sessions through `/api/entities` and shows a `delayed` step as an unchecked step with no badge.

## Not carried here

- A seventh thread state (`delaying`): needs migration `00N` and D13 amended by its keeper (`miadisabelle/asterion#20`).
- A delay badge on the chart itself (map item 5).
- The session and resume command shown to signed-in writers on a page.
- `packages/asterion/src/types.ts` still has no thread state fields (#20 A36). Only `'delayed'` was added there.
- The `PATCH` status allowlist in `app/api/tensions/[id]/action-steps/[stepId]/route.ts` does not accept `delayed`. Projected steps cannot be patched (409), and a step made on the site has no delay record.
- Recording this folder on Episode 297 (the episode's `rispecs` route) belongs to the Episode 297 seat.
