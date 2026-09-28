'use client'

// /bridge — where Asterion's charts come from, shown live.
//
// Charts are written as coaia-narrative JSONL by agents through the COAIA MCP.
// They reach Asterion two ways, and this page draws both and lights the one that
// last carried something: the writer posting to the door, or the registry sync
// reading a file from git. Everything below the diagram is read from the same
// APIs the rest of the app uses, refreshed every 15 seconds.
// The mechanism: lib/asterion/coaia-projection.mjs, scripts/coaia-sync.mjs,
// app/api/ingest/coaia-narrative, and coaia-narrative's src/asterion-bridge.ts.

import { useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { formatDistanceToNow } from 'date-fns'
import { Check, Copy, Radio } from 'lucide-react'
import { AppShell } from '@/components/asterion/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { Project, Tension } from '@/lib/asterion/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const LIVE = { refreshInterval: 15000 }

type AsterionEvent = {
  id: string
  event_type: string
  actor_type: string | null
  actor_id: string | null
  tension_id: string | null
  payload: Record<string, unknown>
  created_at: string
}
type SourceFile = { kind?: string; name?: string | null; syncedAt?: string | null; failing?: boolean }
type Source = { system?: string; key?: string; projectedAt?: string | null; files?: SourceFile[] }

const DOOR = 'oklch(0.72 0.15 165)'
const SYNC = 'oklch(0.72 0.14 255)'
const ago = (iso?: string | null) => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true }) : 'never')
const keyOf = (source: unknown) => (typeof source === 'string' && source.startsWith('coaia-narrative:') ? source.slice('coaia-narrative:'.length) : null)
const RECENT_MS = 10 * 60 * 1000

// ---------- the diagram ----------

type NodeId = 'write' | 'file' | 'door' | 'git' | 'origin' | 'sync' | 'asterion'

const NODES: Record<NodeId, { x: number; y: number; w: number; title: string; sub: string; lane: 'door' | 'sync' | 'both' }> = {
  write: { x: 20, y: 40, w: 165, title: 'An agent writes', sub: 'COAIA MCP chart tools', lane: 'both' },
  file: { x: 240, y: 40, w: 165, title: 'The memory file', sub: 'the .jsonl record', lane: 'both' },
  door: { x: 460, y: 40, w: 165, title: 'The door', sub: 'POST /api/ingest/…', lane: 'door' },
  git: { x: 240, y: 170, w: 165, title: 'Commit and push', sub: 'travels by git', lane: 'sync' },
  origin: { x: 460, y: 170, w: 165, title: 'origin/main', sub: 'read after a fetch', lane: 'sync' },
  sync: { x: 460, y: 270, w: 165, title: 'The registry sync', sub: 'coaia-sync.mjs', lane: 'sync' },
  asterion: { x: 665, y: 150, w: 140, title: 'Asterion', sub: 'one mapper', lane: 'both' },
}

const DETAIL: Record<NodeId, { heading: string; body: string; code?: string }> = {
  write: {
    heading: 'Nothing new to learn for the agent',
    body: 'An agent keeps using the same chart tools: create a chart, add an action step, mark it complete, write a narrative beat. Every one of those ends in one save of the memory file, and that save is where the bridge starts.',
  },
  file: {
    heading: 'The file is the record',
    body: 'The JSONL file is written first and stays the source of truth. Asterion only ever holds a projection of it, and nothing is written back. For an episode, the file lives in the episode folder and is committed with it.',
    code: '.coaia/ep060.coaia-narrative.jsonl',
  },
  door: {
    heading: 'The writer posts the whole file',
    body: 'When the MCP server has three names set, each save is followed by one post of the whole file. Posts never overlap, a burst of saves sends at most two, and a door that is down costs a log line, never a chart. The door only accepts a project registered as fed by its writer.',
    code: 'COAIA_ASTERION_URL · COAIA_ASTERION_TOKEN · COAIA_ASTERION_PROJECT',
  },
  git: {
    heading: 'For files written anywhere',
    body: 'A chart written on a host that cannot reach Asterion still travels: it is committed and pushed with its repository, the way every episode already is.',
  },
  origin: {
    heading: 'Read without touching anyone’s working tree',
    body: 'The sync fetches the remote and reads the file from its remote-tracking branch. Checkouts shared by several agents are never pulled, stashed or switched.',
    code: 'git fetch -- origin && git show origin/main:<path>',
  },
  sync: {
    heading: 'The registry decides what is read',
    body: 'Each registered project names its files. A pass reads them together, skips a project whose files did not change, and never deletes: charts the files no longer carry can be archived, and come back if the file brings them back.',
    code: 'node scripts/coaia-sync.mjs sync',
  },
  asterion: {
    heading: 'One mapper, the same rows either way',
    body: 'Charts become tensions, action steps become action steps, beats become beats, and a chart family with beats becomes a thread. Every row carries the project it came from. Sending the same file twice writes nothing, and only charts that actually changed are logged below.',
    code: "external_source = 'coaia-narrative:<project>'",
  },
}

const EDGES: Array<{ from: NodeId; to: NodeId; lane: 'door' | 'sync'; label: string }> = [
  { from: 'write', to: 'file', lane: 'door', label: 'save' },
  { from: 'file', to: 'door', lane: 'door', label: 'post' },
  { from: 'door', to: 'asterion', lane: 'door', label: 'project' },
  { from: 'file', to: 'git', lane: 'sync', label: 'commit' },
  { from: 'git', to: 'origin', lane: 'sync', label: 'push' },
  { from: 'origin', to: 'sync', lane: 'sync', label: 'fetch' },
  { from: 'sync', to: 'asterion', lane: 'sync', label: 'project' },
]

const anchor = (id: NodeId, side: 'l' | 'r' | 'b' | 't') => {
  const n = NODES[id]
  return side === 'r' ? { x: n.x + n.w, y: n.y + 26 } : side === 'l' ? { x: n.x, y: n.y + 26 } : side === 'b' ? { x: n.x + n.w / 2, y: n.y + 52 } : { x: n.x + n.w / 2, y: n.y }
}

function edgePath(from: NodeId, to: NodeId) {
  if (from === 'file' && to === 'git') { const a = anchor(from, 'b'), b = anchor(to, 't'); return `M${a.x},${a.y} L${b.x},${b.y}` }
  if (from === 'origin' && to === 'sync') { const a = anchor(from, 'b'), b = anchor(to, 't'); return `M${a.x},${a.y} L${b.x},${b.y}` }
  const a = anchor(from, 'r'), b = anchor(to, 'l')
  const mx = (a.x + b.x) / 2
  return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`
}

function FlowDiagram({ active, selected, onSelect }: { active: { door: boolean; sync: boolean }; selected: NodeId; onSelect: (id: NodeId) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <svg viewBox="0 0 820 340" className="block w-full min-w-[680px]" role="img"
        aria-label="An agent's save writes the memory file. From there the writer posts it to Asterion's door, or it is committed and pushed and the registry sync reads it from origin/main. Both reach the same mapper.">
        <defs>
          <marker id="bridge-door" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,1 L7,4.5 L0,8 z" style={{ fill: DOOR }} /></marker>
          <marker id="bridge-sync" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,1 L7,4.5 L0,8 z" style={{ fill: SYNC }} /></marker>
        </defs>
        <text x="20" y="22" style={{ fill: DOOR, fontSize: 11, letterSpacing: 1.2 }} className="font-mono">WRITER → DOOR {active.door ? '· ACTIVE' : ''}</text>
        <text x="20" y="330" style={{ fill: SYNC, fontSize: 11, letterSpacing: 1.2 }} className="font-mono">GIT → REGISTRY SYNC {active.sync ? '· ACTIVE' : ''}</text>
        {EDGES.map((e) => {
          const d = edgePath(e.from, e.to)
          const color = e.lane === 'door' ? DOOR : SYNC
          const on = active[e.lane]
          const a = anchor(e.from, e.from === 'file' && e.to === 'git' ? 'b' : e.from === 'origin' ? 'b' : 'r')
          const b = anchor(e.to, (e.from === 'file' && e.to === 'git') || e.from === 'origin' ? 't' : 'l')
          return (
            <g key={`${e.from}-${e.to}`}>
              <path id={`p-${e.from}-${e.to}`} d={d} fill="none" style={{ stroke: color, opacity: on ? 1 : 0.45 }} strokeWidth={on ? 2 : 1.4}
                strokeDasharray={on ? undefined : '5 5'} markerEnd={`url(#bridge-${e.lane})`} />
              {a.x === b.x ? (
                <text x={a.x + 8} y={(a.y + b.y) / 2 + 4} style={{ fill: 'var(--muted-foreground)', fontSize: 10.5 }}>{e.label}</text>
              ) : (
                <text x={(a.x + b.x) / 2} y={Math.min(a.y, b.y) - 8} textAnchor="middle" style={{ fill: 'var(--muted-foreground)', fontSize: 10.5 }}>{e.label}</text>
              )}
              {on && (
                <circle r="4" style={{ fill: color }} className="motion-reduce:hidden">
                  <animateMotion dur="2.4s" repeatCount="indefinite"><mpath href={`#p-${e.from}-${e.to}`} /></animateMotion>
                </circle>
              )}
            </g>
          )
        })}
        {(Object.keys(NODES) as NodeId[]).map((id) => {
          const n = NODES[id]
          const color = n.lane === 'door' ? DOOR : n.lane === 'sync' ? SYNC : 'var(--foreground)'
          const isSel = selected === id
          return (
            <g key={id} role="button" tabIndex={0} aria-pressed={isSel} aria-label={`${n.title}: ${n.sub}`} className="cursor-pointer outline-none"
              onClick={() => onSelect(id)} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onSelect(id) } }}>
              <rect x={n.x} y={n.y} width={n.w} height={52} rx={8}
                style={{ fill: 'var(--background)', stroke: isSel ? color : 'var(--border)' }} strokeWidth={isSel ? 2 : 1} />
              <rect x={n.x} y={n.y} width={4} height={52} rx={2} style={{ fill: color }} />
              <text x={n.x + 14} y={n.y + 22} style={{ fill: 'var(--foreground)', fontSize: 12.5, fontWeight: 600 }}>{n.title}</text>
              <text x={n.x + 14} y={n.y + 40} style={{ fill: 'var(--muted-foreground)', fontSize: 10.5 }} className="font-mono">{n.sub}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ---------- connecting a project ----------

function CopyBlock({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <div className="relative rounded-md border border-border bg-background">
      <pre className="overflow-x-auto p-3 pr-12 text-xs leading-relaxed"><code>{text}</code></pre>
      <button type="button" aria-label="Copy"
        className="absolute right-2 top-2 rounded p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2"
        onClick={() => { navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) }).catch(() => undefined) }}>
        {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}

const CONNECT = {
  door: {
    label: 'An agent writes it',
    when: 'The agent runs where it can reach Asterion. Every save arrives within seconds.',
    steps: [
      { title: 'Register the project as fed by its writer', code: 'cd app\nnode scripts/coaia-sync.mjs register my-project --name "My project" --writer' },
      { title: 'Give the agent’s MCP server three names', code: '"env": {\n  "COAIA_ASTERION_URL": "http://127.0.0.1:3336",\n  "COAIA_ASTERION_TOKEN": "<the ingest token>",\n  "COAIA_ASTERION_PROJECT": "my-project",\n  "COAIA_ASTERION_ACTOR": "who is writing"\n}' },
      { title: 'Write anything, then look here', code: 'Arrivals below shows the write within seconds, with the writer named.' },
    ],
  },
  sync: {
    label: 'It lives in git',
    when: 'The file is written somewhere else and travels by commit and push. It arrives on the next sync after the push.',
    steps: [
      { title: 'Register the file by repository and path', code: 'cd app\nnode scripts/coaia-sync.mjs register my-project --name "My project" \\\n  --git /path/to/checkout --path .coaia/my-project.coaia-narrative.jsonl' },
      { title: 'Run a pass (the timer does this every five minutes once installed)', code: 'node scripts/coaia-sync.mjs sync my-project' },
      { title: 'See what the registry holds', code: 'node scripts/coaia-sync.mjs list' },
    ],
  },
} as const

// ---------- the page ----------

export default function BridgePage() {
  const [selected, setSelected] = useState<NodeId>('file')
  const [mode, setMode] = useState<'door' | 'sync'>('door')
  const { data: projectsData } = useSWR<{ projects: Project[] }>('/api/projects', fetcher, LIVE)
  const { data: tensionsData } = useSWR<{ tensions: Tension[] }>('/api/tensions', fetcher, LIVE)
  const { data: passData } = useSWR<{ events: AsterionEvent[] }>('/api/events?event_type=coaia.projected&limit=30', fetcher, LIVE)
  const { data: chartData } = useSWR<{ events: AsterionEvent[] }>('/api/events?event_type=tension.projected&limit=40', fetcher, LIVE)

  const projects = (projectsData?.projects ?? []).filter((p) => (p.metadata?.source as Source | undefined)?.system === 'coaia-narrative')
  const tensions = tensionsData?.tensions ?? []
  const passes = passData?.events ?? []
  const arrivals = chartData?.events ?? []
  const titleOf = new Map(tensions.map((t) => [t.id, t.title]))
  const projectName = new Map(projects.map((p) => [(p.metadata?.source as Source).key, p.name]))

  const now = Date.now()
  const lastBy = (type: string) => passes.find((e) => e.actor_type === type)
  const lastDoor = lastBy('writer')
  const lastSync = lastBy('scheduler')
  const active = {
    door: Boolean(lastDoor && now - new Date(lastDoor.created_at).getTime() < RECENT_MS),
    sync: Boolean(lastSync && now - new Date(lastSync.created_at).getTime() < RECENT_MS),
  }
  const latest = passes[0]
  const detail = DETAIL[selected]

  return (
    <AppShell title="Bridge">
      <div className="mb-6 flex flex-col gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Charts are written by agents through the COAIA MCP, as a file that stays the record. This page shows them
          arriving here, and which way each one came.
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Radio className="h-3.5 w-3.5" style={{ color: active.door || active.sync ? DOOR : undefined }} />
          <span>Live, refreshed every 15 seconds.</span>
          {latest && (
            <span>
              Last arrival {ago(latest.created_at)}, written by <span className="text-foreground">{latest.actor_id}</span>
              {keyOf(latest.payload.external_source) ? <> into <span className="text-foreground">{projectName.get(keyOf(latest.payload.external_source)!) ?? keyOf(latest.payload.external_source)}</span></> : null}.
            </span>
          )}
        </p>
      </div>

      <section className="mb-8 flex flex-col gap-3">
        <FlowDiagram active={active} selected={selected} onSelect={setSelected} />
        <p className="text-xs text-muted-foreground">
          A moving dot means that path carried something in the last ten minutes. Select any box to see what happens there.
        </p>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs uppercase tracking-wider">{NODES[selected].title}</CardDescription>
            <CardTitle className="text-base">{detail.heading}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p className="max-w-3xl text-muted-foreground">{detail.body}</p>
            {detail.code && <code className="w-fit rounded bg-background px-2 py-1 font-mono text-xs">{detail.code}</code>}
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Projects</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const src = p.metadata?.source as Source
            const files = src.files ?? []
            const charts = tensions.filter((t) => t.external_source === `coaia-narrative:${src.key}`)
            const byDoor = files.length === 0
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full transition-colors hover:bg-accent/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ color: byDoor ? DOOR : SYNC, background: `color-mix(in oklch, ${byDoor ? DOOR : SYNC} 16%, transparent)` }}>
                        {byDoor ? 'written by its agent' : 'read from git'}
                      </span>
                    </div>
                    <CardDescription className="font-mono text-xs">coaia-narrative:{src.key}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <p><span className="text-foreground">{charts.length}</span> chart{charts.length === 1 ? '' : 's'}, updated {ago(src.projectedAt)}</p>
                    {files.map((f) => (
                      <p key={`${f.kind}-${f.name}`} className="font-mono text-xs">{f.name}{f.failing ? ' · could not be read' : ''}</p>
                    ))}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Arrivals</h2>
        <Card>
          <CardContent className="p-0">
            {arrivals.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No chart has arrived yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {arrivals.slice(0, 20).map((e) => {
                  const key = keyOf(e.payload.external_source)
                  const fromDoor = e.actor_type === 'writer'
                  return (
                    <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 text-sm">
                      <span className="w-28 shrink-0 text-xs text-muted-foreground tabular-nums">{ago(e.created_at)}</span>
                      <span className="rounded px-1.5 text-xs font-medium" style={{ color: fromDoor ? DOOR : SYNC }}>
                        {fromDoor ? 'door' : e.actor_type === 'scheduler' ? 'sync' : e.actor_type}
                      </span>
                      <span className="min-w-0 flex-1">
                        {String(e.payload.change ?? 'projected')}{' '}
                        {e.tension_id ? (
                          <Link href={`/tensions/${e.tension_id}`} className="text-foreground hover:underline">
                            {titleOf.get(e.tension_id) ?? String(e.payload.external_id ?? 'a chart')}
                          </Link>
                        ) : String(e.payload.external_id ?? 'a chart')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {key ? projectName.get(key) ?? key : ''} · {e.actor_id}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold">Connect a project</h2>
        <p className="mb-3 text-sm text-muted-foreground">A project arrives one way only, so the two can never undo each other.</p>
        <div className="mb-3 inline-flex rounded-lg border border-border p-1" role="tablist">
          {(['door', 'sync'] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m}
              className={`rounded-md px-3 py-1.5 text-sm ${mode === m ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setMode(m)}>
              {CONNECT[m].label}
            </button>
          ))}
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <p className="text-sm text-muted-foreground">{CONNECT[mode].when}</p>
            <ol className="flex flex-col gap-4">
              {CONNECT[mode].steps.map((s, i) => (
                <li key={s.title} className="flex flex-col gap-2">
                  <p className="text-sm"><span className="mr-2 font-mono text-xs" style={{ color: mode === 'door' ? DOOR : SYNC }}>{i + 1}</span>{s.title}</p>
                  <CopyBlock text={s.code} />
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <section className="mb-4">
        <h2 className="mb-3 text-lg font-semibold">What never happens</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Nothing is written back', 'The memory file is the record. Asterion only reads it.'],
            ['Nothing is deleted', 'A chart the file no longer carries can be archived, and returns if the file brings it back.'],
            ['No project has two sources', 'Written by its agent, or read from git. Never both.'],
            ['Nothing unregistered is read', 'Registering a project is the decision to show it on this public site.'],
            ['A save never fails because of Asterion', 'If the door is down, the chart is still saved and the next save or sync carries it.'],
            ['No token ever reaches this page', 'The door checks it; this page only reads what is already public.'],
          ].map(([title, body]) => (
            <Card key={title}>
              <CardContent className="flex flex-col gap-1 pt-5 text-sm">
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  )
}
