// The turns a ceremony thread holds, in the order they were spoken
// (miadisabelle/asterion#11). Each turn shows who spoke, when, what was said,
// and who witnessed it. Asterion holds a turn's words only with its speaker's
// consent, and a withdrawn turn keeps its place with its words gone. Nothing
// here counts turns: a circle's container hides engagement metrics.
//
// No imports beyond React, so tests render it from a fixture without the app.

export type Person = { id: string; name: string }

export type Turn = {
  id: string
  title: string | null
  content: string
  created_at: string
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

export function ThreadTurns({ turns }: { turns: Turn[] }) {
  if (!turns.length) {
    return <p className="text-sm text-muted-foreground">No turn has been carried here yet.</p>
  }
  return (
    <ol className="space-y-4" aria-label="Turns">
      {turns.map((turn) => {
        const m = turn.metadata ?? {}
        if (m.withheld) {
          return (
            <li key={turn.id} className="rounded-lg border border-dashed p-4 text-sm italic text-muted-foreground">
              A turn whose words are not held here.
            </li>
          )
        }
        const witnesses = m.witnesses ?? []
        const learnings = (m.learnings ?? []).filter(Boolean)
        return (
          <li key={turn.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{m.speaker?.name ?? 'Someone'}</span>
              <time className="text-xs text-muted-foreground" dateTime={m.spoken_at ?? turn.created_at}>
                {spokenAt(m.spoken_at ?? turn.created_at)}
              </time>
            </div>
            {turn.title && <h3 className="mt-1 text-sm font-semibold">{turn.title}</h3>}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{turn.content}</p>
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
