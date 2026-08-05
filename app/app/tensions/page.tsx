'use client'

import { useState } from 'react'
import { useTensions, useLayers, createTension } from '@/lib/asterion/hooks'
import { AppShell } from '@/components/asterion/app-shell'
import { TensionCard } from '@/components/asterion/tension-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, AlertCircle } from 'lucide-react'
import { useSWRConfig } from 'swr'
import type { Phase } from '@/lib/asterion/types'

export default function TensionsPage() {
  const { mutate } = useSWRConfig()
  const [phaseFilter, setPhaseFilter] = useState<Phase | 'all'>('all')
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const { data, isLoading, error } = useTensions(
    phaseFilter !== 'all' ? { phase: phaseFilter } : undefined
  )
  const { data: layersData } = useLayers()

  const tensions = data?.tensions || []
  const layers = layersData?.layers || []

  const filteredTensions = search
    ? tensions.filter(t => 
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.desired_outcome.toLowerCase().includes(search.toLowerCase())
      )
    : tensions

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError(null)

    const formData = new FormData(e.currentTarget)
    const payload = {
      title: formData.get('title') as string,
      desired_outcome: formData.get('desired_outcome') as string,
      current_reality: formData.get('current_reality') as string,
      layer_id: formData.get('layer_id') as string || undefined,
    }

    try {
      const result = await createTension(payload)

      if (result.error) {
        setCreateError(result.error + (result.errors?.map((e: { message: string }) => ` - ${e.message}`).join('') || ''))
        setIsCreating(false)
        return
      }

      if (result.tension) {
        // Revalidate all tension queries by matching the URL pattern
        mutate((key: string) => typeof key === 'string' && key.startsWith('/api/tensions'))
        setIsCreateOpen(false)
      }
    } catch (err) {
      console.error('Failed to create tension:', err)
      setCreateError('Failed to create tension. Please try again.')
    }

    setIsCreating(false)
  }

  const actions = (
    <Dialog open={isCreateOpen} onOpenChange={(open) => {
      setIsCreateOpen(open)
      if (open) setCreateError(null)
    }}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-9">
          <Plus className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">New Tension</span>
          <span className="sm:hidden">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleCreate}>
          <DialogHeader>
            <DialogTitle>Create Structural Tension</DialogTitle>
            <DialogDescription>
              Define the gap between current reality and desired outcome.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Short descriptive title"
                required
                className="text-base" // Prevents iOS zoom
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desired_outcome">Desired Outcome</Label>
              <Textarea
                id="desired_outcome"
                name="desired_outcome"
                placeholder="What do you want to create? Be specific about the end result."
                required
                rows={3}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_reality">Current Reality</Label>
              <Textarea
                id="current_reality"
                name="current_reality"
                placeholder="Where are you now? Describe the actual current state."
                required
                rows={3}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="layer_id">Layer (Optional)</Label>
              <Select name="layer_id">
                <SelectTrigger className="text-base">
                  <SelectValue placeholder="Select a layer" />
                </SelectTrigger>
                <SelectContent>
                  {layers.map(layer => (
                    <SelectItem key={layer.id} value={layer.id}>
                      {layer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{createError}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Spinner className="mr-2 h-4 w-4" />}
              Create Tension
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )

  return (
    <AppShell title="Structural Tensions" actions={actions}>
      {/* Filters */}
      <div className="mb-6 space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tensions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-base"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
          {(['all', 'germination', 'assimilation', 'completion'] as const).map((phase) => (
            <Button
              key={phase}
              variant={phaseFilter === phase ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPhaseFilter(phase)}
              className="flex-shrink-0 capitalize"
            >
              {phase}
            </Button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load tensions</p>
        </div>
      ) : filteredTensions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No tensions match your search' : 'No tensions yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTensions.map(tension => (
            <TensionCard key={tension.id} tension={tension} />
          ))}
        </div>
      )}
    </AppShell>
  )
}
