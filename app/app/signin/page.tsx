'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AppShell } from '@/components/asterion/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Session = { enabled: boolean; signed_in: boolean; name: string | null; via: string | null; writer: boolean }

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SignInPage() {
  const { data: session, mutate } = useSWR<Session>('/api/session', fetcher)
  const [token, setToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const body = await res.json().catch(() => ({}))
    setMessage(res.ok ? body.note ?? null : body.error ?? 'Signing in failed.')
    setToken('')
    setBusy(false)
    mutate()
  }

  const signOut = async () => {
    await fetch('/api/session', { method: 'DELETE' })
    setMessage(null)
    mutate()
  }

  return (
    <AppShell title="Sign in">
      <div className="max-w-md space-y-4">
        <p className="text-sm text-muted-foreground">
          Anyone can read Asterion. Changing it (projects, charts, steps, docs) needs a person Miadi gives write
          access. Sign in with your Miadi token: Asterion asks Miadi who it belongs to and does not keep it.
        </p>
        {!session ? null : !session.enabled ? (
          <p className="text-sm">Signing in is not enabled on this instance.</p>
        ) : session.signed_in ? (
          <div className="space-y-3">
            <p className="text-sm">
              Signed in as <strong>{session.name}</strong>
              {session.via === 'miadi' ? ' through Miadi' : ''}.{' '}
              {session.writer ? 'You can change Asterion.' : 'Miadi gives you no write access, so you can only read.'}
            </p>
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          </div>
        ) : (
          <form onSubmit={signIn} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="miadi-token">Miadi token</Label>
              <Input
                id="miadi-token"
                type="password"
                autoComplete="current-password"
                placeholder="mwt_…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!token || busy}>{busy ? 'Asking Miadi…' : 'Sign in'}</Button>
          </form>
        )}
        {message && <p className="text-sm text-destructive">{message}</p>}
      </div>
    </AppShell>
  )
}
