'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { useProject, useTensions } from '@/lib/asterion/hooks'
import type { ProjectSeat } from '@/lib/asterion/types'
import { Input } from '@/components/ui/input'
import { AppShell } from '@/components/asterion/app-shell'
import { TensionCard } from '@/components/asterion/tension-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { AlertCircle, ChevronLeft, FolderKanban, Target, Armchair } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, error, mutate } = useProject(id)
  const { data: tensionsData } = useTensions()

  const project = data?.project
  const allTensions = tensionsData?.tensions || []

  const projectTensions = project?.tensions?.map(pt => {
    return allTensions.find(t => t.id === pt.tension_id) || pt
  }).filter(Boolean) || []

  if (isLoading) {
    return (
      <AppShell title="Loading...">
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </AppShell>
    )
  }

  if (error || !project) {
    return (
      <AppShell title="Not Found">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-medium mb-2">Project not found</h2>
          <Link href="/projects">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm">
      <Link href="/projects" className="text-muted-foreground hover:text-foreground">
        Projects
      </Link>
      <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
      <span className="truncate max-w-[150px] md:max-w-none">{project.name}</span>
    </div>
  )

  return (
    <AppShell title={breadcrumb}>
      {/* Header info */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          {project.codename && (
            <p className="font-mono text-sm text-muted-foreground">{project.codename}</p>
          )}
        </div>
        <FolderKanban className="h-6 w-6 text-muted-foreground flex-shrink-0" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Description */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {project.description || 'No description provided.'}
            </p>
          </CardContent>
        </Card>

        {/* Meta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-right">{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span className="text-right">{formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tensions</span>
              <span>{projectTensions.length}</span>
            </div>
            <SeatEditor
              projectId={project.id}
              seat={(project.metadata?.seat as ProjectSeat | undefined) ?? null}
              onSaved={() => mutate()}
            />
          </CardContent>
        </Card>

        {/* Project Tensions */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Tensions</CardTitle>
            <CardDescription>
              Tensions associated with this orchestration lens
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectTensions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No tensions linked to this project yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projectTensions.map((tension: any) => (
                  <TensionCard key={tension.id} tension={tension} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

type Session = { enabled: boolean; signed_in: boolean; writer: boolean }
const fetchJson = (url: string) => fetch(url).then((res) => res.json())

/** The seat: the agent session that keeps this project's charts. Anyone sees it; a writer names it. */
function SeatEditor({ projectId, seat, onSaved }: { projectId: string; seat: ProjectSeat | null; onSaved: () => void }) {
  const { data: session } = useSWR<Session>('/api/session', fetchJson)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const save = async (next: { session: string; host: string } | null) => {
    setBusy(true)
    setMessage(null)
    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seat: next }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { setMessage(body.error ?? 'Saving the seat failed.'); return }
    setEditing(false)
    onSaved()
  }

  const start = () => {
    setName(seat?.session ?? '')
    setHost(seat?.host ?? '')
    setEditing(true)
  }

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-1.5 text-muted-foreground" title="The agent session that keeps this project's charts">
          <Armchair className="h-4 w-4" /> Seat
        </span>
        <span className="text-right">
          {seat ? (
            <>
              <span className="font-mono">{seat.session}</span>
              {seat.host && <span className="text-muted-foreground"> on {seat.host}</span>}
            </>
          ) : (
            <span className="text-muted-foreground">none named</span>
          )}
        </span>
      </div>
      {seat && (
        <p className="text-right text-xs text-muted-foreground">
          named by {seat.set_by} {formatDistanceToNow(new Date(seat.set_at), { addSuffix: true })}
        </p>
      )}
      {session?.writer && !editing && (
        <Button variant="outline" size="sm" className="w-full" onClick={start}>
          {seat ? 'Change the seat' : 'Name the seat'}
        </Button>
      )}
      {editing && (
        <form
          className="space-y-2"
          onSubmit={(e) => { e.preventDefault(); save({ session: name, host }) }}
        >
          <Input aria-label="tmux session" placeholder="tmux session, e.g. stcbot" value={name} onChange={(e) => setName(e.target.value)} />
          <Input aria-label="host" placeholder="host (optional), e.g. gaia" value={host} onChange={(e) => setHost(e.target.value)} />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!name.trim() || busy}>{busy ? 'Saving…' : 'Save'}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            {seat && (
              <Button type="button" size="sm" variant="ghost" className="ml-auto" disabled={busy} onClick={() => save(null)}>Clear</Button>
            )}
          </div>
        </form>
      )}
      {message && <p className="text-xs text-destructive">{message}</p>}
    </div>
  )
}
