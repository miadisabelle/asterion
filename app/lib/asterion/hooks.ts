'use client'

import useSWR from 'swr'
import type { Tension, Phase, Layer, Project } from '@/lib/asterion/types'

const fetcher = (url: string) => fetch(url).then(res => res.json())

// Tensions
export function useTensions(filters?: {
  phase?: Phase
  status?: string
  layer_id?: string
  parent_id?: string | null
}) {
  const params = new URLSearchParams()
  if (filters?.phase) params.set('phase', filters.phase)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.layer_id) params.set('layer_id', filters.layer_id)
  if (filters?.parent_id !== undefined) {
    params.set('parent_id', filters.parent_id === null ? 'null' : filters.parent_id)
  }

  const query = params.toString()
  const url = `/api/tensions${query ? `?${query}` : ''}`

  return useSWR<{ tensions: Tension[] }>(url, fetcher)
}

export function useTension(id: string | null) {
  return useSWR<{ tension: Tension }>(
    id ? `/api/tensions/${id}` : null,
    fetcher
  )
}

// Projects
export function useProjects() {
  return useSWR<{ projects: Project[] }>('/api/projects', fetcher)
}

export function useProject(id: string | null) {
  return useSWR<{ project: Project }>(
    id ? `/api/projects/${id}` : null,
    fetcher
  )
}

// Layers
export function useLayers() {
  return useSWR<{ layers: Layer[] }>('/api/layers', fetcher)
}

// Graph
export function useGraph(rootId?: string) {
  const url = rootId ? `/api/graph?root_id=${rootId}` : '/api/graph'
  return useSWR<{
    nodes: Tension[]
    edges: Array<{
      id: string
      from_tension_id: string
      to_tension_id: string
      edge_type: string
    }>
    meta: { node_count: number; edge_count: number }
  }>(url, fetcher)
}

// Events
export function useEvents(filters?: {
  tension_id?: string
  event_type?: string
  limit?: number
}) {
  const params = new URLSearchParams()
  if (filters?.tension_id) params.set('tension_id', filters.tension_id)
  if (filters?.event_type) params.set('event_type', filters.event_type)
  if (filters?.limit) params.set('limit', String(filters.limit))

  const query = params.toString()
  const url = `/api/events${query ? `?${query}` : ''}`

  return useSWR<{ events: Array<{
    id: string
    event_type: string
    actor_type: string | null
    tension_id: string | null
    payload: Record<string, unknown>
    created_at: string
  }> }>(url, fetcher)
}

// Threads
export function useThreads() {
  return useSWR<{ threads: Array<{
    id: string
    name: string
    thread_type: string | null
    description: string | null
    created_at: string
  }> }>('/api/threads', fetcher)
}

// Mutations
export async function createTension(data: {
  title: string
  desired_outcome: string
  current_reality: string
  phase?: Phase
  layer_id?: string
  parent_id?: string
}) {
  const res = await fetch('/api/tensions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateTension(id: string, data: Partial<Tension>) {
  const res = await fetch(`/api/tensions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function createProject(data: {
  name: string
  codename?: string
  description?: string
}) {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function createActionStep(tensionId: string, data: {
  title: string
  description?: string
  assigned_to?: string
}) {
  const res = await fetch(`/api/tensions/${tensionId}/action-steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function telescopeActionStep(tensionId: string, actionStepId: string, tension: {
  title: string
  desired_outcome: string
  current_reality: string
}) {
  const res = await fetch(`/api/tensions/${tensionId}/telescope`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_step_id: actionStepId, tension }),
  })
  return res.json()
}
