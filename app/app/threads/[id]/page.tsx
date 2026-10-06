'use client'

import { use } from 'react'
import Link from 'next/link'
import { useThread } from '@/lib/asterion/hooks'
import { AppShell } from '@/components/asterion/app-shell'
import { ProvenanceBadges } from '@/components/asterion/provenance'
import { ThreadBeats, emptyLine, spokenAt, type Beat } from '@/components/asterion/thread-beats'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, ChevronLeft, ExternalLink } from 'lucide-react'

export default function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, error } = useThread(id)
  const thread = data?.thread

  if (isLoading) {
    return (
      <AppShell title="Loading...">
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </AppShell>
    )
  }

  if (error || !thread) {
    return (
      <AppShell title="Not Found">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-medium mb-2">Thread not found</h2>
          <Link href="/threads">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Threads
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const meta = (thread.metadata ?? {}) as Record<string, unknown>
  const openedAt = typeof meta.opened_at === 'string' ? meta.opened_at : null
  const closedAt = typeof meta.closed_at === 'string' ? meta.closed_at : null
  const beats = (data?.beats ?? []) as unknown as Beat[]
  const charts = data?.charts ?? []
  const chartTitles = Object.fromEntries(charts.map((c) => [c.id, c.title]))

  return (
    <AppShell title={thread.name}>
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/threads" className="text-muted-foreground hover:text-foreground">
            Threads
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="truncate">{thread.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {thread.thread_type && <span className="rounded-full bg-muted px-2 py-0.5">{thread.thread_type}</span>}
          {openedAt && <span>Opened {spokenAt(openedAt)}</span>}
          {openedAt && <span>{closedAt ? `Closed ${spokenAt(closedAt)}` : 'Open'}</span>}
          {meta.archived === true && <span>No longer on the wheel</span>}
          <ProvenanceBadges source={thread.external_source} />
        </div>
        {thread.description && thread.description !== thread.name && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{thread.description}</p>
        )}
        {data?.miadi_url && (
          <a
            href={data.miadi_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm underline underline-offset-4 hover:text-foreground"
          >
            Speak, witness or close this ceremony in Miadi
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {charts.length > 0 && (
        <section className="mb-6" aria-label="Charts">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Charts this thread follows</h2>
          <ul className="space-y-1 text-sm">
            {charts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline gap-2">
                <Link href={`/tensions/${c.id}`} className="min-w-0 break-words underline-offset-4 hover:underline">
                  {c.title}
                </Link>
                {c.status && <span className="text-xs text-muted-foreground">{c.status}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      <ThreadBeats beats={beats} charts={chartTitles} empty={emptyLine(thread.thread_type)} />
    </AppShell>
  )
}
