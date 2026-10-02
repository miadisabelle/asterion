'use client'

import Link from 'next/link'
import useSWR from 'swr'

type Session = { enabled: boolean; signed_in: boolean; name: string | null; writer: boolean }

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/** Who is signed in, beside every page title: changing Asterion needs a signed-in writer. */
export function SessionBadge() {
  const { data } = useSWR<Session>('/api/session', fetcher)
  if (!data?.enabled) return null
  return (
    <Link
      href="/signin"
      className="text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
      title={data.signed_in ? (data.writer ? 'Signed in; you can change Asterion' : 'Signed in; read only') : 'Sign in to change Asterion'}
    >
      {data.signed_in ? `${data.name}${data.writer ? '' : ' (read only)'}` : 'Sign in'}
    </Link>
  )
}
