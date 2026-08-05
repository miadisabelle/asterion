'use client'

import { useThreads } from '@/lib/asterion/hooks'
import { AppShell } from '@/components/asterion/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, BookOpen } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ThreadsPage() {
  const { data, isLoading, error } = useThreads()
  const threads = data?.threads || []

  return (
    <AppShell title="Narrative Threads">
      <div className="mb-6">
        <p className="text-muted-foreground text-sm md:text-base">
          Threads organize tensions into narratives: technical, release, incident, educational.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load threads</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No narrative threads yet</h3>
          <p className="text-sm text-muted-foreground">
            Threads will be created as tensions are organized into narratives.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {threads.map(thread => (
            <Card key={thread.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{thread.name}</CardTitle>
                    {thread.thread_type && (
                      <CardDescription className="text-xs">
                        {thread.thread_type}
                      </CardDescription>
                    )}
                  </div>
                  <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                {thread.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {thread.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Created {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
