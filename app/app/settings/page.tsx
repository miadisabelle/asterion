'use client'

// /settings — what this Asterion instance is set to, read only.
//
// Who you are here, which coaia-narrative memories feed it, and which instance
// you are looking at. Changing any of it happens elsewhere: signing in at
// /signin, registering a source with scripts/coaia-sync.mjs.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { AppShell } from '@/components/asterion/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Project } from '@/lib/asterion/types'

type Session = { enabled: boolean; signed_in: boolean; name: string | null; via: string | null; writer: boolean }
type Source = { system?: string; key?: string; files?: Array<{ kind?: string; name?: string | null }> }

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SettingsPage() {
  const { data: session } = useSWR<Session>('/api/session', fetcher)
  const { data: projectsData } = useSWR<{ projects: Project[] }>('/api/projects', fetcher)
  const [host, setHost] = useState<string | null>(null)
  useEffect(() => setHost(window.location.host), [])

  const sources = (projectsData?.projects ?? []).filter(
    (p) => (p.metadata?.source as Source | undefined)?.system === 'coaia-narrative'
  )

  return (
    <AppShell title="Settings">
      <div className="flex max-w-3xl flex-col gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Account</CardTitle>
            <CardDescription>Anyone can read Asterion. Changing it needs a person Miadi gives write access.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            {!session ? (
              <p className="text-muted-foreground">Reading…</p>
            ) : !session.enabled ? (
              <p>Signing in is not enabled on this instance, so it is read only.</p>
            ) : session.signed_in ? (
              <p>
                Signed in as <strong>{session.name}</strong>
                {session.via === 'miadi' ? ' through Miadi' : ''}.{' '}
                {session.writer ? 'You can change Asterion.' : 'You can only read.'}{' '}
                <Link href="/signin" className="underline underline-offset-4">Sign out</Link>
              </p>
            ) : (
              <p>
                Not signed in.{' '}
                <Link href="/signin" className="underline underline-offset-4">Sign in with your Miadi token</Link>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chart sources</CardTitle>
            <CardDescription>
              The coaia-narrative memories this Asterion reads. A memory that is not registered here is never shown,
              and a private one is shown only to signed-in writers.{' '}
              <Link href="/bridge" className="underline underline-offset-4">How charts arrive</Link>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {!projectsData ? (
              <p className="text-muted-foreground">Reading…</p>
            ) : sources.length === 0 ? (
              <p className="text-muted-foreground">No memory is registered.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sources.map((p) => {
                  const src = p.metadata?.source as Source
                  const files = src.files ?? []
                  return (
                    <li key={p.id}>
                      <Link href={`/projects/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">coaia-narrative:{src.key}</span>
                      {p.metadata?.visibility === 'private' && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">private: signed-in writers only</span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {files.length === 0 ? 'Written by its agent through the door.' : files.map((f) => f.name).join(', ')}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">
              Registering a memory is done on the host that runs the sync:{' '}
              <code className="rounded bg-background px-1.5 py-0.5 font-mono">node scripts/coaia-sync.mjs register &lt;key&gt; --name &quot;…&quot; --file &lt;path&gt; [--private]</code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">This instance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p className="font-mono text-xs">{host ?? '…'}</p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
