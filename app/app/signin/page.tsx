'use client'

import { useEffect, useState } from 'react'
import { AppShell } from '@/components/asterion/app-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Session = { writer: boolean; enabled: boolean }

export default function SignInPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    const res = await fetch('/api/session')
    setSession(await res.json())
  }

  useEffect(() => {
    load()
  }, [])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (!res.ok) setError((await res.json())?.error ?? 'Signing in failed.')
    setToken('')
    load()
  }

  const signOut = async () => {
    await fetch('/api/session', { method: 'DELETE' })
    load()
  }

  return (
    <AppShell title="Sign in">
      <div className="max-w-md space-y-4">
        <p className="text-sm text-muted-foreground">
          A signed-in writer's steps on a chart that records a GitHub issue are also opened on GitHub as sub-issues.
          Everyone else's steps stay on the site.
        </p>
        {session === null ? null : !session.enabled ? (
          <p className="text-sm">Signing in is not enabled on this instance.</p>
        ) : session.writer ? (
          <div className="space-y-3">
            <p className="text-sm">This browser is signed in as a writer.</p>
            <Button variant="outline" onClick={signOut}>Sign out</Button>
          </div>
        ) : (
          <form onSubmit={signIn} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="writer-token">Writer token</Label>
              <Input
                id="writer-token"
                type="password"
                autoComplete="current-password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={!token}>Sign in</Button>
          </form>
        )}
      </div>
    </AppShell>
  )
}
