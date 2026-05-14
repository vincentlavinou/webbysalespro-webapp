'use client'

import { CalendarX, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function NoAvailableSessionsMessage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4 dark:bg-slate-950/40">
      <div className="w-full max-w-xl">
        <Card className="border-gray-200 bg-white/90 shadow-md dark:border-slate-700 dark:bg-slate-900/80">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CalendarX className="h-5 w-5 text-red-500" />
              <Badge variant="destructive" className="text-sm">
                No Upcoming Sessions
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800 dark:text-slate-100">
              No sessions available to register
            </CardTitle>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
              Please check back later or contact the organizer if you were expecting a session.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-100 p-4 text-center dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex items-center justify-center space-x-2 text-gray-700 dark:text-slate-300">
                <Clock className="h-4 w-4" />
                <span className="text-sm">We&apos;re waiting for a session to be scheduled.</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              If you believe this is a mistake, please reach out to support or try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
