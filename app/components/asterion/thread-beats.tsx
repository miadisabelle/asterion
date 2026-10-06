// The beats a reader follows in a thread, in the order they happened
// (miadisabelle/asterion#11, miadisabelle/asterion#20 A39). A ceremony's turn
// shows who spoke, its words and who witnessed it. Asterion holds a turn's
// words only with its speaker's consent, and a withdrawn turn keeps its place
// with its words gone. A chart's beat shows which chart it belongs to and its
// kind. Nothing here counts beats: a circle's container hides engagement metrics.
//
// No imports beyond React, so tests render it from a fixture without the app.

export type Person = { id: string; name: string }

export type Beat = {
  id: string
  title: string | null
  content: string
  created_at: string
  beat_type?: string | null
  tension_id?: string | null
  metadata: {
    speaker?: Person
    witnesses?: Person[]
    learnings?: string[]
    spoken_at?: string
    withheld?: boolean
  } & Record<string, unknown>
}

/** '2026-10-02T14:05:09.000Z' → '2026-10-02 14:05 UTC' */
export function spokenAt(iso: string | undefined | null): string {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isNaN(t) ? '' : `${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

/** What an empty thread says, by what kind of thread it is. */
export function emptyLine(threadType: string | null | undefined): string {
  if (threadType === 'ceremony') return 'No consented turn has been carried here yet.'
  if (threadType === 'chart-family') return 'The charts in this family carry no beat yet.'
  return 'Nothing has been carried into this thread yet.'
}

export function ThreadBeats({
  beats,
  charts = {},
  empty,
}: {
  beats: Beat[]
  /** Chart titles by tension id, to name the chart a beat belongs to. */
  charts?: Record<string, string>
  empty: string
}) {
  if (!beats.length) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <ol className="space-y-4" aria-label="Beats">
      {beats.map((beat) => {
        const m = beat.metadata ?? {}
        if (m.withheld) {
          return (
            <li key={beat.id} className="rounded-lg border border-dashed p-4 text-sm italic text-muted-foreground">
              A turn whose words are not held here.
            </li>
          )
        }
        const witnesses = m.witnesses ?? []
        const learnings = (m.learnings ?? []).filter(Boolean)
        const chart = beat.tension_id ? charts[beat.tension_id] : undefined
        const who = m.speaker?.name ?? chart ?? 'Someone'
        const kind = beat.beat_type && beat.beat_type !== 'turn' && beat.beat_type !== 'beat' ? beat.beat_type : null
        const showTitle = beat.title && !beat.content.startsWith(beat.title)
        return (
          <li key={beat.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="min-w-0 font-medium break-words">{who}</span>
              <time className="text-xs text-muted-foreground" dateTime={m.spoken_at ?? beat.created_at}>
                {spokenAt(m.spoken_at ?? beat.created_at)}
              </time>
            </div>
            {kind && <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{kind}</span>}
            {showTitle && <h3 className="mt-1 text-sm font-semibold">{beat.title}</h3>}
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{beat.content}</p>
            {learnings.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {learnings.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            )}
            {witnesses.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Witnessed by {witnesses.map((w) => w.name).join(', ')}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
