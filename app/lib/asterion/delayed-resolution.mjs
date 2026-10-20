// Delayed resolution, as Asterion reads it.
//
// coaia-narrative 0.24 lets an action step carry a strategic choice to delay its
// resolution: who chose, until when resolution is wanted (resolveBy), why, what the
// wait serves, the event cues to wake on, and the agent session to rehydrate.
// The record sits in the step's metadata as `delayedResolution`; earlier records
// move to `delayedResolutionHistory`. A written step keeps it on its action_step
// entity, a telescoped step on its child chart's `<chartId>_desired_outcome`.
// Origin: miadi-chronicle Episode 297, delayed-resolution-design-261019.md;
// specification: rispecs/delayed-resolution/.
//
// The rule is inlined, not imported from the writer: Asterion reads the record and
// keeps its own lineage. A record is an object with a string resolveBy; it is open
// while it has no endedAt.
//
// The session names a host, a directory, a tmux pane and a resume command. It is
// for signed-in writers only: the step rows never carry it, and entity metadata
// loses it on its way to anyone else (publicEntity).
//
// Plain ESM with no node imports, so the mapper, the data layer and the pages
// share it.

const DAY_MS = 24 * 60 * 60 * 1000

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/**
 * The delay record in an entity's metadata, open or ended, or null.
 * @param {Record<string, unknown> | null | undefined} metadata
 */
export function delayRecordOf(metadata) {
  const r = isObject(metadata) ? metadata.delayedResolution : null
  return isObject(r) && typeof r.resolveBy === 'string' ? r : null
}

/** A record that has not ended. */
export const isOpenDelay = (record) => isObject(record) && typeof record.resolveBy === 'string' && !record.endedAt

/** How many earlier delays the step carried. */
export const delayHistoryCount = (metadata) =>
  isObject(metadata) && Array.isArray(metadata.delayedResolutionHistory) ? metadata.delayedResolutionHistory.length : 0

/**
 * @typedef {{
 *   resolveBy: string,
 *   chosenAt: string | null,
 *   chosenBy: string | null,
 *   reason: string | null,
 *   primaryChoice: string | null,
 *   wakeOn: string[],
 *   endedAt?: string,
 *   endedBy?: string | null,
 *   outcome?: string | null,
 *   endNote?: string | null,
 * }} PublicDelay
 */

/**
 * What a step row may carry of a delay: everything but the session.
 * @param {Record<string, unknown> | null} record
 * @returns {PublicDelay | null}
 */
export function publicDelay(record) {
  if (!isObject(record) || typeof record.resolveBy !== 'string') return null
  const out = {
    resolveBy: record.resolveBy,
    chosenAt: str(record.chosenAt),
    chosenBy: str(record.chosenBy),
    reason: str(record.reason),
    primaryChoice: str(record.primaryChoice),
    wakeOn: Array.isArray(record.wakeOn) ? record.wakeOn.map(str).filter(Boolean) : [],
  }
  if (record.endedAt) {
    out.endedAt = String(record.endedAt)
    out.endedBy = str(record.endedBy)
    out.outcome = str(record.outcome)
    out.endNote = str(record.endNote)
  }
  return out
}

/**
 * Entity metadata without the session of any delay it carries, open, ended or in
 * its history. Returns the same object when there is nothing to remove.
 * @param {Record<string, unknown>} metadata
 */
export function withoutDelaySessions(metadata) {
  if (!isObject(metadata)) return metadata
  const strip = (r) => {
    if (!isObject(r) || !('session' in r)) return r
    const rest = { ...r }
    delete rest.session
    return rest
  }
  const current = metadata.delayedResolution
  const history = metadata.delayedResolutionHistory
  const touches = (isObject(current) && 'session' in current) || (Array.isArray(history) && history.some((r) => isObject(r) && 'session' in r))
  if (!touches) return metadata
  return {
    ...metadata,
    ...(isObject(current) ? { delayedResolution: strip(current) } : {}),
    ...(Array.isArray(history) ? { delayedResolutionHistory: history.map(strip) } : {}),
  }
}

/** An entity row as a viewer who may not see private data receives it. */
export function publicEntity(entity) {
  if (!isObject(entity) || !isObject(entity.metadata)) return entity
  const metadata = withoutDelaySessions(entity.metadata)
  return metadata === entity.metadata ? entity : { ...entity, metadata }
}

/** Whole days until resolveBy, counted up; negative once it has passed. */
export function daysRemaining(resolveBy, now = Date.now()) {
  const days = Math.ceil((Date.parse(resolveBy) - now) / DAY_MS)
  return days === 0 ? 0 : days
}

/** An open delay whose resolveBy has passed is owed. */
export const isOwed = (resolveBy, now = Date.now()) => Date.parse(resolveBy) < now

/** The UTC day of a time, as yyyy-mm-dd, or null. */
export function dayOf(time) {
  const t = typeof time === 'string' ? Date.parse(time) : NaN
  return Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10)
}

/** "in 3 days", "today", or "owed", for an open delay. */
export function remainingWords(resolveBy, now = Date.now()) {
  if (isOwed(resolveBy, now)) return 'owed'
  const days = daysRemaining(resolveBy, now)
  return days <= 0 ? 'today' : days === 1 ? 'in 1 day' : `in ${days} days`
}

/**
 * A step row's delay, read back from its metadata, or null.
 * @param {Record<string, unknown> | null | undefined} metadata
 * @returns {PublicDelay | null}
 */
export function stepDelayOf(metadata) {
  const d = isObject(metadata) ? metadata.delayedResolution : null
  return isObject(d) && typeof d.resolveBy === 'string' && !Number.isNaN(Date.parse(d.resolveBy)) ? d : null
}

/**
 * A chart thread's `metadata.delaying`, read back, or null.
 * @returns {{ resolveBy: string, owed: boolean, asOf: string | null, steps: { step: string, chartId: string, title: string, resolveBy: string }[] } | null}
 */
export function threadDelayingOf(metadata) {
  const d = isObject(metadata) ? metadata.delaying : null
  if (!isObject(d) || typeof d.resolveBy !== 'string' || Number.isNaN(Date.parse(d.resolveBy))) return null
  return {
    resolveBy: d.resolveBy,
    owed: d.owed === true,
    asOf: str(d.asOf),
    steps: Array.isArray(d.steps) ? d.steps.filter(isObject) : [],
  }
}
