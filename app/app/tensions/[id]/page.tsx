'use client'

import { use, useState } from 'react'
import { useTension, updateTension, createActionStep } from '@/lib/asterion/hooks'
import { AppShell } from '@/components/asterion/app-shell'
import { PhaseBadge, StatusBadge, LayerBadge, EdgeTypeBadge } from '@/components/asterion/badges'
import { TensionCard } from '@/components/asterion/tension-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { Checkbox } from '@/components/ui/checkbox'
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
import { 
  Target, 
  ChevronLeft, 
  Plus, 
  GitBranch,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  Circle,
  Pause,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { mutate } from 'swr'
import { formatDistanceToNow } from 'date-fns'
import type { Phase, ActionStep } from '@/lib/asterion/types'

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  blocked: XCircle,
  skipped: Pause,
}

export default function TensionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, error } = useTension(id)
  const [isAddStepOpen, setIsAddStepOpen] = useState(false)
  const [isAddingStep, setIsAddingStep] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const tension = data?.tension

  const handlePhaseChange = async (phase: Phase) => {
    if (!tension) return
    setIsUpdating(true)
    await updateTension(tension.id, { phase })
    mutate(`/api/tensions/${id}`)
    setIsUpdating(false)
  }

  const handleAddStep = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!tension) return
    setIsAddingStep(true)

    const formData = new FormData(e.currentTarget)
    await createActionStep(tension.id, {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
    })

    mutate(`/api/tensions/${id}`)
    setIsAddStepOpen(false)
    setIsAddingStep(false)
  }

  const handleStepStatusChange = async (stepId: string, status: ActionStep['status']) => {
    await fetch(`/api/tensions/${id}/action-steps/${stepId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    mutate(`/api/tensions/${id}`)
  }

  if (isLoading) {
    return (
      <AppShell title="Loading...">
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </AppShell>
    )
  }

  if (error || !tension) {
    return (
      <AppShell title="Not Found">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-medium mb-2">Tension not found</h2>
          <Link href="/tensions">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Tensions
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const actionSteps = tension.action_steps || []
  const children = tension.children || []
  const edgesFrom = tension.edges_from || []
  const edgesTo = tension.edges_to || []

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm">
      <Link href="/tensions" className="text-muted-foreground hover:text-foreground">
        Tensions
      </Link>
      <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
      <span className="truncate max-w-[150px] md:max-w-none">{tension.title}</span>
    </div>
  )

  const actions = (
    <Select 
      value={tension.phase} 
      onValueChange={(v) => handlePhaseChange(v as Phase)}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[140px] md:w-[160px] text-base">
        <SelectValue placeholder="Phase" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="germination">Germination</SelectItem>
        <SelectItem value="assimilation">Assimilation</SelectItem>
        <SelectItem value="completion">Completion</SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <AppShell title={breadcrumb} actions={actions}>
      {/* Status badges */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <PhaseBadge phase={tension.phase} />
        <StatusBadge status={tension.status} />
        {tension.layer && (
          <LayerBadge 
            layerType={tension.layer.layer_type} 
            name={tension.layer.name} 
          />
        )}
        {tension.telescope_depth > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
            <GitBranch className="h-3 w-3" />
            <span>Depth {tension.telescope_depth}</span>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Structural Tension */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Structural Tension</CardTitle>
              <CardDescription>
                The gap between current reality and desired outcome
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Desired Outcome</Label>
                <p className="mt-1 text-sm">{tension.desired_outcome}</p>
              </div>
              <div className="flex items-center justify-center py-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-px w-8 md:w-12 bg-border" />
                  <Target className="h-4 w-4" />
                  <div className="h-px w-8 md:w-12 bg-border" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Current Reality</Label>
                <p className="mt-1 text-sm">{tension.current_reality}</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Steps */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Action Steps</CardTitle>
                  <CardDescription>
                    Decomposition into executable actions
                  </CardDescription>
                </div>
                <Dialog open={isAddStepOpen} onOpenChange={setIsAddStepOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-9">
                      <Plus className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Add Step</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleAddStep}>
                      <DialogHeader>
                        <DialogTitle>Add Action Step</DialogTitle>
                        <DialogDescription>
                          Break down the tension into a concrete action.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="step-title">Title</Label>
                          <Input
                            id="step-title"
                            name="title"
                            placeholder="What needs to be done?"
                            required
                            className="text-base"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="step-description">Description (Optional)</Label>
                          <Textarea
                            id="step-description"
                            name="description"
                            placeholder="Additional details..."
                            rows={3}
                            className="text-base"
                          />
                        </div>
                      </div>
                      <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setIsAddStepOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isAddingStep}>
                          {isAddingStep && <Spinner className="mr-2 h-4 w-4" />}
                          Add Step
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {actionSteps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No action steps yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {actionSteps.map(step => {
                    return (
                      <div 
                        key={step.id}
                        className="flex items-start gap-3 rounded-md border border-border p-3 min-h-[52px]"
                      >
                        <Checkbox
                          checked={step.status === 'completed'}
                          onCheckedChange={(checked) => 
                            handleStepStatusChange(step.id, checked ? 'completed' : 'pending')
                          }
                          className="mt-0.5 h-5 w-5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-medium ${step.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                              {step.title}
                            </span>
                            {step.telescoped_to_tension_id && (
                              <Link href={`/tensions/${step.telescoped_to_tension_id}`}>
                                <span className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  <GitBranch className="h-3 w-3" />
                                  telescoped
                                </span>
                              </Link>
                            )}
                          </div>
                          {step.description && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {step.description}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Children (Telescoped) */}
          {children.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Child Tensions</CardTitle>
                <CardDescription>
                  Recursively decomposed from action steps
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {children.map(child => (
                  <TensionCard key={child.id} tension={child} compact />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-3xl font-bold">{tension.progress}%</div>
              <Progress value={tension.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {actionSteps.filter(s => s.status === 'completed').length} of {actionSteps.length} steps completed
              </p>
            </CardContent>
          </Card>

          {/* Edges */}
          {(edgesFrom.length > 0 || edgesTo.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dependencies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {edgesFrom.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">This tension...</Label>
                    <div className="mt-2 space-y-2">
                      {edgesFrom.map(edge => (
                        <div key={edge.id} className="flex flex-wrap items-center gap-2">
                          <EdgeTypeBadge edgeType={edge.edge_type} />
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Link 
                            href={`/tensions/${edge.to_tension_id}`}
                            className="text-sm hover:underline truncate max-w-[120px]"
                          >
                            {(edge as { to_tension_title?: string }).to_tension_title || 'View'}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {edgesTo.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Depends on...</Label>
                    <div className="mt-2 space-y-2">
                      {edgesTo.map(edge => (
                        <div key={edge.id} className="flex flex-wrap items-center gap-2">
                          <Link 
                            href={`/tensions/${edge.from_tension_id}`}
                            className="text-sm hover:underline truncate max-w-[120px]"
                          >
                            {(edge as { from_tension_title?: string }).from_tension_title || 'View'}
                          </Link>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <EdgeTypeBadge edgeType={edge.edge_type} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Meta */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-right">{formatDistanceToNow(new Date(tension.created_at), { addSuffix: true })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span className="text-right">{formatDistanceToNow(new Date(tension.updated_at), { addSuffix: true })}</span>
              </div>
              {tension.phase_started_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phase started</span>
                  <span className="text-right">{formatDistanceToNow(new Date(tension.phase_started_at), { addSuffix: true })}</span>
                </div>
              )}
              {tension.due_date && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span className="text-right">{formatDistanceToNow(new Date(tension.due_date), { addSuffix: true })}</span>
                </div>
              )}
              {tension.parent_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parent</span>
                  <Link href={`/tensions/${tension.parent_id}`} className="text-primary hover:underline">
                    View parent
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
