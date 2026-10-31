# Brief: merge what only Neon held into Asterion's own Postgres

Written by `scripts/ops/asterion-neon-watch.sh` the day Neon answered again. Asterion has run on
`asterion-postgres` (docker/compose.yml) since 2026-10-31, on **provisional** data: 34 projects registered by guess
from the `.coaia` issue files on gaia, every one of them `--private`, plus the writer project `ep060`. Neon kept the
real data while its quota was exceeded; the watcher has now copied it, read-only, into the database `asterion_neon`
of the same container (schema `asterion`, as on Neon). Counts are at the end of this file.

Background: `~/workspace/factory/missions/asterion-local-db-261031.md` and its brief.

## Your task

1. **Read before writing.** Compare `asterion_neon.asterion.*` with the live `asterion.asterion.*`, table by table, and
   write the comparison down: rows only in Neon, rows only local, rows in both (same `id`, or same
   `external_source` + `external_id` for rows projected from coaia files).
2. **Adopt Neon's registry.** `asterion_neon.asterion.projects` is the real list of projects: their keys, their files
   (`metadata.source.files`), writer projects, and their visibility. Where a provisional key differs from Neon's key
   for the same file, keep Neon's key and remove the provisional project with its projected rows, then re-sync
   (`node app/scripts/coaia-sync.mjs sync --force`): the files stay the record. Never make a project public that Neon
   had private.
3. **Bring over what only Neon held**, keeping each row's `id`: doc_pages, doc_sections, doc_revisions, doc_links,
   mmot_evaluations, observations, tension_edges, the events Neon has and the local log lacks, and every chart, step,
   thread, beat, entity or relation made in Asterion's pages (rows without `external_source = coaia-narrative:*`).
   Writer projects' content comes back with them.
4. **Where both have a row and they differ**, a row projected from a coaia file follows the file (re-sync); a row made
   in the pages follows Neon unless the local row is newer (`updated_at`), and each such case goes in your report.
5. **Check:** row counts after the merge, `/api/threads` and `/api/tensions` on :3336 as a writer and anonymously, and
   `scripts/ops/asterion-pg-parity-check.mjs --from-env ~/.config/asterion/neon.env` for the tables only Neon held.

## Not yours

- Nothing is written to Neon, and nothing is deleted, paid for or upgraded there.
- Keep `asterion_neon` until Guillaume says it can go.
- Do not print a URL, password or token. Commit only files you wrote, by path.

## Done when

A report in `~/workspace/factory/missions/asterion-neon-merge-<yymmdd>.md` (what was compared, adopted, brought over,
left, and why), committed and pushed by path in `miadisabelle/workspace`, and the questions only Guillaume can
answer coded Q1, Q2 and so on.
