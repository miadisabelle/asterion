/**
 * A row projected from a chart memory (external_source set) is the memory's, not the
 * site's. The registry sync rewrites it from the file on every pass, so an edit made
 * here would last until the next sync and then vanish without a word. Asterion never
 * writes the chart file (the chart-path practice): a projected chart is changed where
 * it is kept, by the agent that keeps it or on the GitHub issue it records, and its
 * save returns through the door or the sync.
 *
 * What stays open on a projected chart: adding a step (a site row, and a sub-issue when
 * the chart records an issue), edges and MMOT evaluations, which the sync never writes.
 */

import { NextResponse } from 'next/server'
import { sql } from './db'

export function isProjected(row: { external_source?: string | null } | null | undefined): boolean {
  return Boolean(row?.external_source)
}

/** 409 for a write to a projected row, or null when the row belongs to the site. */
export function refuseProjected(
  row: { external_source?: string | null } | null | undefined,
  what: 'chart' | 'step'
): NextResponse | null {
  if (!isProjected(row)) return null
  return NextResponse.json(
    {
      error: 'projected',
      message: `This ${what} comes from a chart memory (${row!.external_source}). An edit here would be overwritten at the next sync: change it where the chart is kept, through the agent that keeps it or on the GitHub issue it records.`,
      external_source: row!.external_source,
    },
    { status: 409 }
  )
}

/** A step's projection source, read for a write route that holds only its id. */
export async function stepSource(stepId: string, tensionId: string): Promise<{ external_source: string | null } | null> {
  const rows = await sql`SELECT external_source FROM asterion.action_steps WHERE id = ${stepId} AND tension_id = ${tensionId}`
  return (rows[0] as { external_source: string | null } | undefined) ?? null
}
