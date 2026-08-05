'use client'

import { use } from 'react'
import { useProject, useTensions } from '@/lib/asterion/hooks'
import { AppShell } from '@/components/asterion/app-shell'
import { TensionCard } from '@/components/asterion/tension-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import { AlertCircle, ChevronLeft, FolderKanban, Target } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, isLoading, error } = useProject(id)
  const { data: tensionsData } = useTensions()

  const project = data?.project
  const allTensions = tensionsData?.tensions || []

  const projectTensions = project?.tensions?.map(pt => {
    return allTensions.find(t => t.id === pt.tension_id) || pt
  }).filter(Boolean) || []

  if (isLoading) {
    return (
      <AppShell title="Loading...">
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      </AppShell>
    )
  }

  if (error || !project) {
    return (
      <AppShell title="Not Found">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-medium mb-2">Project not found</h2>
          <Link href="/projects">
            <Button variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  const breadcrumb = (
    <div className="flex items-center gap-2 text-sm">
      <Link href="/projects" className="text-muted-foreground hover:text-foreground">
        Projects
      </Link>
      <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
      <span className="truncate max-w-[150px] md:max-w-none">{project.name}</span>
    </div>
  )

  return (
    <AppShell title={breadcrumb}>
      {/* Header info */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          {project.codename && (
            <p className="font-mono text-sm text-muted-foreground">{project.codename}</p>
          )}
        </div>
        <FolderKanban className="h-6 w-6 text-muted-foreground flex-shrink-0" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Description */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {project.description || 'No description provided.'}
            </p>
          </CardContent>
        </Card>

        {/* Meta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-right">{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span className="text-right">{formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tensions</span>
              <span>{projectTensions.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Project Tensions */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Project Tensions</CardTitle>
            <CardDescription>
              Tensions associated with this orchestration lens
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectTensions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No tensions linked to this project yet.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projectTensions.map((tension: any) => (
                  <TensionCard key={tension.id} tension={tension} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
