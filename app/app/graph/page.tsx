'use client'

import { useGraph } from '@/lib/asterion/hooks'
import { AppShell } from '@/components/asterion/app-shell'
import { PhaseBadge, EdgeTypeBadge } from '@/components/asterion/badges'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Network, Target, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { Tension } from '@/lib/asterion/types'

// Simple force-directed layout calculation
function calculateLayout(
  nodes: Tension[],
  edges: Array<{ from_tension_id: string; to_tension_id: string }>,
  containerWidth: number
) {
  const nodeMap = new Map<string, { x: number; y: number; tension: Tension }>()
  const width = containerWidth
  const height = Math.min(500, containerWidth * 0.6)
  const padding = 40

  // Initialize positions in a circle
  nodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / nodes.length
    const radius = Math.min(width, height) / 2 - padding
    nodeMap.set(node.id, {
      x: width / 2 + radius * Math.cos(angle),
      y: height / 2 + radius * Math.sin(angle),
      tension: node,
    })
  })

  // Simple force simulation (10 iterations)
  for (let iter = 0; iter < 10; iter++) {
    const forces = new Map<string, { fx: number; fy: number }>()
    nodes.forEach(node => forces.set(node.id, { fx: 0, fy: 0 }))

    nodes.forEach((nodeA, i) => {
      nodes.slice(i + 1).forEach(nodeB => {
        const posA = nodeMap.get(nodeA.id)!
        const posB = nodeMap.get(nodeB.id)!
        const dx = posB.x - posA.x
        const dy = posB.y - posA.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = 5000 / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        forces.get(nodeA.id)!.fx -= fx
        forces.get(nodeA.id)!.fy -= fy
        forces.get(nodeB.id)!.fx += fx
        forces.get(nodeB.id)!.fy += fy
      })
    })

    edges.forEach(edge => {
      const posA = nodeMap.get(edge.from_tension_id)
      const posB = nodeMap.get(edge.to_tension_id)
      if (posA && posB) {
        const dx = posB.x - posA.x
        const dy = posB.y - posA.y
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
        const force = dist * 0.01
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        forces.get(edge.from_tension_id)!.fx += fx
        forces.get(edge.from_tension_id)!.fy += fy
        forces.get(edge.to_tension_id)!.fx -= fx
        forces.get(edge.to_tension_id)!.fy -= fy
      }
    })

    nodeMap.forEach((pos, id) => {
      const f = forces.get(id)!
      pos.x = Math.max(padding, Math.min(width - padding, pos.x + f.fx * 0.1))
      pos.y = Math.max(padding, Math.min(height - padding, pos.y + f.fy * 0.1))
    })
  }

  return { nodeMap, width, height }
}

const phaseColors = {
  germination: '#c4a55a',
  assimilation: '#6b7fd6',
  completion: '#4ade80',
}

export default function GraphPage() {
  const { data, isLoading, error } = useGraph()

  const nodes = data?.nodes || []
  const edges = data?.edges || []

  // Use responsive width
  const containerWidth = typeof window !== 'undefined' 
    ? Math.min(window.innerWidth - 32, 800) 
    : 800

  const layout = nodes.length > 0 ? calculateLayout(nodes, edges, containerWidth) : null

  const meta = data?.meta && (
    <div className="text-xs md:text-sm text-muted-foreground">
      {data.meta.node_count} nodes, {data.meta.edge_count} edges
    </div>
  )

  return (
    <AppShell title="Tension Graph" actions={meta}>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load graph</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Network className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No tensions in graph</h3>
          <p className="text-sm text-muted-foreground">
            Create tensions and dependencies to visualize the graph.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Graph Visualization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dependency Graph</CardTitle>
              <CardDescription>
                Tension relationships and topology
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border bg-background/50 -mx-2 px-2">
                <svg 
                  width={layout?.width || containerWidth} 
                  height={layout?.height || 300}
                  className="min-w-[300px]"
                >
                  {/* Edges */}
                  {layout && edges.map(edge => {
                    const from = layout.nodeMap.get(edge.from_tension_id)
                    const to = layout.nodeMap.get(edge.to_tension_id)
                    if (!from || !to) return null
                    return (
                      <g key={edge.id}>
                        <line
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke="currentColor"
                          strokeOpacity={0.3}
                          strokeWidth={1}
                        />
                      </g>
                    )
                  })}
                  {/* Nodes */}
                  {layout && Array.from(layout.nodeMap.values()).map(({ x, y, tension }) => (
                    <Link key={tension.id} href={`/tensions/${tension.id}`}>
                      <g className="cursor-pointer" transform={`translate(${x}, ${y})`}>
                        <circle
                          r={16}
                          fill={phaseColors[tension.phase]}
                          fillOpacity={0.2}
                          stroke={phaseColors[tension.phase]}
                          strokeWidth={2}
                        />
                        <circle
                          r={5}
                          fill={phaseColors[tension.phase]}
                        />
                        <title>{tension.title}</title>
                      </g>
                    </Link>
                  ))}
                </svg>
              </div>
              {/* Legend */}
              <div className="mt-4 flex flex-wrap items-center gap-4 md:gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#c4a55a]" />
                  <span className="text-xs text-muted-foreground">Germination</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#6b7fd6]" />
                  <span className="text-xs text-muted-foreground">Assimilation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#4ade80]" />
                  <span className="text-xs text-muted-foreground">Completion</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Node List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tensions</CardTitle>
              <CardDescription>{nodes.length} total</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[300px] overflow-auto space-y-2">
              {nodes.map(tension => (
                <Link key={tension.id} href={`/tensions/${tension.id}`}>
                  <div className="flex items-center justify-between rounded-md border border-border p-3 transition-colors hover:bg-accent/30 min-h-[44px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Target className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{tension.title}</span>
                    </div>
                    <PhaseBadge phase={tension.phase} />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Edges List */}
          {edges.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dependencies</CardTitle>
                <CardDescription>{edges.length} edges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {edges.map(edge => {
                    const from = nodes.find(n => n.id === edge.from_tension_id)
                    const to = nodes.find(n => n.id === edge.to_tension_id)
                    return (
                      <div key={edge.id} className="flex flex-wrap items-center gap-2 text-sm p-2 rounded-md bg-muted/30">
                        <span className="truncate text-muted-foreground max-w-[120px] md:max-w-none">
                          {from?.title || 'Unknown'}
                        </span>
                        <EdgeTypeBadge edgeType={edge.edge_type} />
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate max-w-[120px] md:max-w-none">
                          {to?.title || 'Unknown'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  )
}
