'use client'

import { useLayers } from '@/lib/asterion/hooks'
import { AppShell } from '@/components/asterion/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Box, Database, Shield, FileText, Eye, Lock, Terminal } from 'lucide-react'
import type { LayerType } from '@/lib/asterion/types'

const layerIcons: Record<LayerType, React.ComponentType<{ className?: string }>> = {
  runtime: Terminal,
  memory: Database,
  governance: Shield,
  pde: Box,
  docs: FileText,
  security: Lock,
  operator: Eye,
}

export default function LayersPage() {
  const { data, isLoading, error } = useLayers()
  const layers = data?.layers || []

  return (
    <AppShell title="Layer Taxonomy">
      <div className="mb-6">
        <p className="text-muted-foreground text-sm md:text-base">
          Canonical architectural layers that organize tensions, entities, and execution across the system.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load layers</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {layers.map(layer => {
            const Icon = layerIcons[layer.layer_type as LayerType] || Box
            return (
              <Card key={layer.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base">{layer.name}</CardTitle>
                        <CardDescription className="font-mono text-xs">
                          {layer.layer_type}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {layer.description || 'No description'}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </AppShell>
  )
}
