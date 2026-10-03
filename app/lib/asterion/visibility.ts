// Who may read a private project.
//
// A project registered with `scripts/coaia-sync.mjs register <key> --private`
// carries metadata.visibility = 'private'. Its charts, steps, beats, threads,
// entities and events are shown only to a signed-in writer. Every read that can
// carry them takes a Viewer, and anything that is not a writer's viewer hides
// them: a read that forgets to ask shows less, never more.
//
// scripts/check-read-gates.mjs fails the build when a GET route never asks.

import { currentWriter } from './writer'

export type Viewer = { includePrivate: boolean }

export const PUBLIC_VIEWER: Viewer = { includePrivate: false }

/** For Asterion's own bookkeeping (a chart's progress), never for what a reader receives. */
export const BOOKKEEPING: Viewer = { includePrivate: true }

/** The viewer behind a request: a signed-in writer sees private projects, anyone else does not. */
export function viewerOf(request: Request): Viewer {
  return { includePrivate: currentWriter(request) !== null }
}

export const seesPrivate = (viewer?: Viewer | null): boolean => viewer?.includePrivate === true

// SQL fragments, each a subquery usable inside IN (…). None of them yields NULL.

export const PRIVATE_PROJECT_IDS = `SELECT id FROM asterion.projects WHERE metadata->>'visibility' = 'private'`

/** external_source values the rows of private coaia-narrative projects carry. */
export const PRIVATE_SOURCES = `SELECT 'coaia-narrative:' || external_id FROM asterion.projects
  WHERE external_source = 'coaia-narrative' AND external_id IS NOT NULL AND metadata->>'visibility' = 'private'`

/** Charts of a private project: projected from its file, placed in it, or nested under one of those. */
export const PRIVATE_TENSION_IDS = `WITH RECURSIVE hidden(id) AS (
    SELECT id FROM asterion.tensions WHERE external_source IN (${PRIVATE_SOURCES})
    UNION SELECT tension_id FROM asterion.project_tensions WHERE project_id IN (${PRIVATE_PROJECT_IDS})
    UNION SELECT t.id FROM asterion.tensions t JOIN hidden h ON t.parent_id = h.id
  ) SELECT id FROM hidden`

export const PRIVATE_THREAD_IDS = `SELECT id FROM asterion.narrative_threads WHERE external_source IN (${PRIVATE_SOURCES})
  UNION SELECT thread_id FROM asterion.thread_tensions WHERE tension_id IN (${PRIVATE_TENSION_IDS})`
