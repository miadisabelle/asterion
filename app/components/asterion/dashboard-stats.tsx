'use client'

import { useTensions, useLayers } from '@/lib/asterion/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TensionCard } from './tension-card'
import { PhaseBadge, LayerBadge } from './badges'
import { Spinner } from '@/components/ui/spinner'
import { Target, Layers, Activity, GitBranch, AlertCircle } from 'lucide-react'
import type { Phase, LayerType } from '@/lib/asterion/types'

export function DashboardStats() {
  const { data: tensionsData, isLoading: tensionsLoading } = useTensions()
  const { data: layersData, isLoading: layersLoading } = useLayers()

  if (tensionsLoading || layersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const tensions = tensionsData?.tensions || []
  const layers = layersData?.layers || []

  // Calculate stats
  const phaseDistribution = {
    germination: tensions.filter(t => t.phase === 'germination').length,
    assimilation: tensions.filter(t => t.phase === 'assimilation').length,
    completion: tensions.filter(t => t.phase === 'completion').length,
  }

  const activeTensions = tensions.filter(t => t.status === 'active')
  const totalProgress = activeTensions.length > 0
    ? Math.round(activeTensions.reduce((sum, t) => sum + t.progress, 0) / activeTensions.length)
    : 0

  const rootTensions = tensions.filter(t => !t.parent_id)
  const telescopedCount = tensions.filter(t => t.source_action_step_id).length

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tensions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tensions.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeTensions.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProgress}%</div>
            <p className="text-xs text-muted-foreground">
              across active tensions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Layers</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{layers.length}</div>
            <p className="text-xs text-muted-foreground">
              canonical taxonomy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Telescoped</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{telescopedCount}</div>
            <p className="text-xs text-muted-foreground">
              recursive decompositions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Phase Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Phase Distribution</CardTitle>
          <CardDescription>
            Lifecycle state across all tensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            {(Object.entries(phaseDistribution) as [Phase, number][]).map(([phase, count]) => (
              <div key={phase} className="flex items-center gap-3">
                <PhaseBadge phase={phase} />
                <span className="text-2xl font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Layers Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Layer Taxonomy</CardTitle>
          <CardDescription>
            Canonical architectural layers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {layers.map(layer => (
              <LayerBadge 
                key={layer.id} 
                layerType={layer.layer_type as LayerType} 
                name={layer.name} 
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tensions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Root Tensions</CardTitle>
            <CardDescription>
              Top-level structural tensions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rootTensions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No tensions yet</p>
              </div>
            ) : (
              rootTensions.slice(0, 5).map(tension => (
                <TensionCard key={tension.id} tension={tension} compact />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>In Assimilation</CardTitle>
            <CardDescription>
              Tensions actively being worked
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {phaseDistribution.assimilation === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">None in assimilation</p>
              </div>
            ) : (
              tensions
                .filter(t => t.phase === 'assimilation')
                .slice(0, 5)
                .map(tension => (
                  <TensionCard key={tension.id} tension={tension} compact />
                ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
