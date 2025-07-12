'use client'

import { CalendarX, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function NoAvailableSessionsMessage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-xl">
        <Card className="shadow-md border-gray-200">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CalendarX className="h-5 w-5 text-red-500" />
              <Badge variant="destructive" className="text-sm">
                No Upcoming Sessions
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              No sessions available to register
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Please check back later or contact the organizer if you were expecting a session.
            </p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-700">
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
