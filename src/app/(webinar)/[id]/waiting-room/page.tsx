'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DateTime } from 'luxon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock, Users, Calendar } from 'lucide-react'
import { useWebinar } from '@/webinar/hooks'
import { SeriesSession, WebinarPresenter } from '@/webinar/service'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { broadcastApiUrl } from '@/broadcast/service'

export default function WaitingRoomPage() {
  const router = useRouter()

  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Use the webinar hook to get session information
  const { sessionId, session, webinar, token, setSession } = useWebinar()


  useEffect(() => {
    if (!session) return

    const updateCountdown = () => {
      const now = DateTime.local()
      const sessionTime = DateTime.fromISO(session.scheduled_start, { 
        zone: session.timezone || 'utc' 
      })
      const diff = sessionTime.diff(now, ['days', 'hours', 'minutes', 'seconds'])

      if (diff.toMillis() <= 0) {
        setTimeLeft('Starting soon...')
      } else {
        setTimeLeft(`${diff.days}d ${diff.hours}h ${diff.minutes}m ${Math.floor(diff.seconds)}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {

    if (!token || !sessionId) return

    const source = new EventSource(
      `${broadcastApiUrl}/v1/sessions/events/?channels=webinar-session-${sessionId}&token=${token}`
    )

    source.addEventListener('webinar:session:update', (event: MessageEvent) => {
      const data = JSON.parse(event.data)
      console.log('Session update received:', data)
      
      if (data.status === WebinarSessionStatus.IN_PROGRESS) {
        setIsRedirecting(true)
        setSession({...session, status: WebinarSessionStatus.IN_PROGRESS} as SeriesSession)
        source.close()
        router.push(`/${sessionId}/live?token=${token}`)

      }
    })

    source.onerror = (error) => {
      console.error('EventSource error:', error)
      source.close()
    }

    return () => {
      source.close()
    }
  }, [sessionId, token, router, setSession])

  if (!session || !webinar) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading session...</span>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-800">Session not found</h1>
          <p className="text-gray-600 mt-2">The session you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  const formattedDate = DateTime.fromISO(session.scheduled_start, { 
    zone: session.timezone || 'utc' 
  }).toFormat("cccc, LLL d @ t ZZZZ")

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {isRedirecting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium">Connecting to session...</span>
            </div>
          </div>
        )}

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <Badge variant="secondary" className="text-sm">
                Waiting Room
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              {webinar?.title || 'Webinar Session'}
            </CardTitle>
            <p className="text-gray-600 mt-2">
              {webinar?.description || 'Session will begin shortly'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Countdown */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-sm text-blue-600 font-medium mb-1">Session starts in</div>
              <div className="text-2xl font-bold text-blue-800 font-mono">
                {timeLeft}
              </div>
            </div>

            {/* Session Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-500" />
                <div>
                  <div className="font-medium text-gray-800">Session Time</div>
                  <div className="text-sm text-gray-600">{formattedDate}</div>
                </div>
              </div>

              {webinar?.presenters && webinar.presenters.length > 0 && (
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium text-gray-800">Hosted by</div>
                    <div className="text-sm text-gray-600">
                      {webinar.presenters.map((p: WebinarPresenter, i: number) => (
                        <span key={p.id}>
                          {p.name}
                          {i < webinar.presenters.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <Badge variant="outline" className="text-xs">
                  {session.status}
                </Badge>
                <span className="text-sm text-gray-600">
                  Session ID: {session.id}
                </span>
              </div>
            </div>

            {/* Info Message */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mt-2"></div>
                </div>
                <div>
                  <div className="font-medium text-gray-800">You&apos;ll be automatically redirected</div>
                  <div className="text-sm text-gray-600 mt-1">
                    When the session starts, you&apos;ll be taken to the live room automatically. 
                    Please don&apos;t close this window.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
