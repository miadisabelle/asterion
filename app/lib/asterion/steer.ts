// A steer: a writer's words on a chart, given to the agent that keeps it.
//
// It leaves only from gaia (D6, 2026-10-20). ASTERION_STEERING=on is set in
// gaia's app/.env.local and nowhere else, so the public deployments answer
// that steering is not here. A steer starts a fresh session of the keeper
// through its door (D7), never types into a running pane: the doors are
// Miadi's agent-handoff file, the same list a talking circle's revision uses
// (jgwill/Miadi lib/agent-handoff.ts), read on every steer, so editing it
// turns a door on or off with no deploy.
//
// The door kind Asterion opens is `claude-print`: `claude -p` in the seat's
// folder, with only the seat's chart server (--strict-mcp-config) and
// --permission-mode dontAsk, so the session can read files and change the
// chart, and nothing else. Its answer reaches Asterion the way every chart
// change does, through the ingest door or the registry sync.

import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { chmod, mkdir, open, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ProjectSeat, Tension } from './types'

export type SteerStatus = 'preview' | 'sent' | 'off' | 'no-door' | 'failed'

export interface Door {
  name: string
  kind: string
  bin?: string
}

const DOORS_FILE = () => process.env.MIADI_AGENT_HANDOFF_FILE || '/srv/miadi/agent-handoff.json'
const STEER_DIR = () => process.env.ASTERION_STEER_DIR || '/srv/miadi/agent-handoff/asterion'

/** True only on the instance that may start agents: gaia. */
export function steeringHere(): boolean {
  return process.env.ASTERION_STEERING === 'on'
}

export async function readDoors(): Promise<{ enabled: boolean; doors: Record<string, Door> }> {
  try {
    const raw = JSON.parse(await readFile(/*turbopackIgnore: true*/ DOORS_FILE(), 'utf8')) as { enabled?: unknown; doors?: unknown }
    return {
      enabled: raw.enabled === true,
      doors: raw.doors && typeof raw.doors === 'object' ? (raw.doors as Record<string, Door>) : {},
    }
  } catch {
    return { enabled: false, doors: {} }
  }
}

export function steerBrief(args: {
  chart: Pick<Tension, 'id' | 'title' | 'desired_outcome' | 'current_reality' | 'external_id'>
  projectName: string
  seat: ProjectSeat
  text: string
  from: string
  chartUrl: string
}): string {
  const { chart, seat } = args
  return [
    `${args.from} steers a chart you keep, from Asterion. Answer on the chart itself.`,
    '',
    `Chart: ${chart.title}`,
    `Project: ${args.projectName}`,
    chart.external_id ? `Chart id in your chart memory: ${chart.external_id}` : null,
    `Desired outcome: ${chart.desired_outcome}`,
    `Current reality: ${chart.current_reality}`,
    `On Asterion: ${args.chartUrl}`,
    '',
    'The steer:',
    args.text,
    '',
    `Your tools for this run are the chart server ${seat.mcp_server} and reading files. Read the chart, do what the steer asks`,
    'on the chart (an observation, a step, a step marked done, a narrative beat), and end with one sentence saying what',
    'you changed, or why you changed nothing. Your change reaches Asterion by itself. Do not run commands or edit files.',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

/** The one server of `<folder>/.mcp.json` that writes this project's charts. */
async function chartServer(seat: ProjectSeat): Promise<{ ok: true; config: object } | { ok: false; detail: string }> {
  if (!seat.folder || !seat.mcp_server) return { ok: false, detail: `${seat.name}'s seat names no folder and chart server` }
  try {
    const all = JSON.parse(await readFile(path.join(/*turbopackIgnore: true*/ seat.folder, '.mcp.json'), 'utf8')) as { mcpServers?: Record<string, unknown> }
    const server = all.mcpServers?.[seat.mcp_server]
    if (!server) return { ok: false, detail: `${seat.folder}/.mcp.json has no server ${seat.mcp_server}` }
    return { ok: true, config: { mcpServers: { [seat.mcp_server]: server } } }
  } catch (err) {
    return { ok: false, detail: `${seat.folder}/.mcp.json could not be read (${err instanceof Error ? err.message : String(err)})` }
  }
}

/** What the agent inherits: who and where it is, never Asterion's own credentials. */
function agentEnv(): Record<string, string> {
  const keep = ['HOME', 'USER', 'LOGNAME', 'PATH', 'LANG', 'SHELL', 'XDG_RUNTIME_DIR']
  return Object.fromEntries(keep.flatMap((k) => (process.env[k] ? [[k, process.env[k] as string]] : [])))
}

export interface SteerOutcome {
  status: SteerStatus
  detail: string
  agent_name: string
  door: string | null
  brief?: string
  session_id?: string
  log?: string
}

/** Resolve the keeper's door; with dryRun, return what would be sent; otherwise start the session. */
export async function steer(seat: ProjectSeat, brief: string, dryRun: boolean): Promise<SteerOutcome> {
  const base = { agent_name: seat.name, door: null as string | null }
  const { enabled, doors } = await readDoors()
  if (!enabled) return { ...base, status: 'off', detail: 'The agent hand-off is turned off on this host' }
  const door = doors[seat.agent]
  if (!door) return { ...base, status: 'no-door', detail: `No door is recorded for ${seat.name}` }
  if (door.kind !== 'claude-print') {
    return { ...base, door: door.name, status: 'no-door', detail: `${door.name}'s door is ${door.kind}, which Asterion does not open` }
  }
  const server = await chartServer(seat)
  if (!server.ok) return { ...base, door: door.name, status: 'failed', detail: server.detail }
  if (dryRun) {
    return { ...base, door: door.name, status: 'preview', brief, detail: `Would start a fresh ${door.name} session in ${seat.folder}, with only ${seat.mcp_server}` }
  }

  const sessionId = randomUUID()
  const dir = STEER_DIR()
  try {
    await mkdir(/*turbopackIgnore: true*/ dir, { recursive: true, mode: 0o700 })
    await chmod(/*turbopackIgnore: true*/ dir, 0o700)
    // The server's env can hold its ingest token, so the file is the owner's alone.
    const configPath = path.join(/*turbopackIgnore: true*/ dir, `${sessionId}.mcp.json`)
    await writeFile(/*turbopackIgnore: true*/ configPath, JSON.stringify(server.config), { mode: 0o600 })
    const logPath = path.join(/*turbopackIgnore: true*/ dir, `${sessionId}.log`)
    const log = await open(/*turbopackIgnore: true*/ logPath, 'a', 0o600)
    const child = spawn(
      /*turbopackIgnore: true*/ door.bin || 'claude',
      [
        '-p', brief,
        '--session-id', sessionId,
        '--output-format', 'json',
        '--mcp-config', configPath,
        '--strict-mcp-config',
        '--permission-mode', 'dontAsk',
        '--allowedTools', `mcp__${seat.mcp_server}`, 'Read', 'Grep', 'Glob',
      ],
      { cwd: /*turbopackIgnore: true*/ seat.folder!, detached: true, stdio: ['ignore', log.fd, log.fd], env: agentEnv() as unknown as NodeJS.ProcessEnv }
    )
    const started = await new Promise<{ ok: boolean; detail: string }>((resolve) => {
      child.once('error', (err) => resolve({ ok: false, detail: `${door.name} could not be started (${err.message})` }))
      child.once('spawn', () => resolve({ ok: true, detail: `Started a fresh ${door.name} session` }))
    })
    child.unref()
    await log.close()
    if (!started.ok) return { ...base, door: door.name, status: 'failed', detail: started.detail }
    return { ...base, door: door.name, status: 'sent', detail: started.detail, session_id: sessionId, log: logPath }
  } catch (err) {
    return { ...base, door: door.name, status: 'failed', detail: `${door.name} could not be started (${err instanceof Error ? err.message : String(err)})` }
  }
}
