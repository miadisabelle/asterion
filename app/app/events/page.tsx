'use client'

import { useEvents } from '@/lib/asterion/hooks'
import { AppShell } from '@/components/asterion/app-shell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function EventsPage() {
  const { data, isLoading, error } = useEvents({ limit: 100 })
  const events = data?.events || []

  return (
    <AppShell title="Event Log">
      <div className="mb-6">
        <p className="text-muted-foreground text-sm md:text-base">
          Immutable execution history for replay, archaeology, and timeline reconstruction.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load events</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No events yet</h3>
          <p className="text-sm text-muted-foreground">
            Events will appear here as you interact with the system.
          </p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Recent Events</CardTitle>
            <CardDescription>{events.length} events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.map(event => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 md:gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 md:gap-2">
                      <span className="font-mono text-xs md:text-sm font-medium break-all">
                        {event.event_type}
                      </span>
                      {event.actor_type && (
                        <span className="text-xs text-muted-foreground">
                          by {event.actor_type}
                        </span>
                      )}
                    </div>
                    {Object.keys(event.payload).length > 0 && (
                      <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto max-w-full">
                        {JSON.stringify(event.payload, null, 2).slice(0, 100)}
                        {JSON.stringify(event.payload).length > 100 && '...'}
                      </pre>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AppShell>
  )
}
