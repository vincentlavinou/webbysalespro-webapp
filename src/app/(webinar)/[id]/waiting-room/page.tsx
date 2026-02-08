'use client'

import { useEffect, useState } from 'react'
import { DateTime } from 'luxon'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Clock, Users, Calendar } from 'lucide-react'
import { useWebinar } from '@/webinar/hooks'
import { useSessionPresence } from '@/broadcast/hooks'
import { WebinarPresenter } from '@/webinar/service'
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { useRouter } from 'next/navigation'

const BRAND = '#25D366'            // primary brand
const BRAND_DARK = '#1fa653'       // slightly darker for dark mode accents

export default function EarlyAccessRoomPage() {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  const router = useRouter()
  const { session, webinar, token, broadcastServiceToken } = useWebinar()
  const { markRoom } = useSessionPresence(token || '')

  useEffect(() => {
    if (token) markRoom("waiting_room")
  }, [token, markRoom])

  // Countdown timer
  useEffect(() => {
    if (!session) return

    const updateCountdown = () => {
      const now = DateTime.local()
      const sessionTime = DateTime.fromISO(session.scheduled_start, {
        zone: session.timezone || 'utc',
      })
      const diff = sessionTime.diff(now, ['days', 'hours', 'minutes', 'seconds'])

      if (diff.toMillis() <= 0) {
        setTimeLeft('Starting soon...')
      } else {
        setTimeLeft(
          `${diff.days}d ${diff.hours}h ${diff.minutes}m ${Math.floor(diff.seconds)}s`
        )
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [session])

  // Redirect to live room once session is in progress
  useEffect(() => {
    if (!session || !token) return

    if (session.status === WebinarSessionStatus.IN_PROGRESS && broadcastServiceToken?.stream) {
      setIsRedirecting(true)
      router.replace(`/${session.id}/live?token=${token}`)
    }
  }, [session, token, router, broadcastServiceToken])

  if (!session || !webinar || !token) {
    return <WaitingRoomShimmer />
  }

  const formattedDate = DateTime.fromISO(session.scheduled_start, {
    zone: session.timezone || 'utc',
  }).toFormat('cccc, LLL d @ t ZZZZ')

  return (
    <div
      className="w-full min-h-screen flex items-center justify-center p-4
                 bg-white text-gray-800
                 dark:bg-neutral-950 dark:text-gray-100"
    >
      <div className="w-full max-w-2xl">
        {isRedirecting && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center
                       bg-black/50 backdrop-blur-sm"
          >
            <div
              className="rounded-lg p-6 flex items-center space-x-3
                         bg-white text-gray-800
                         dark:bg-neutral-900 dark:text-gray-100
                         shadow-lg border border-gray-200 dark:border-neutral-800"
            >
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: BRAND }} />
              <span className="text-lg font-medium">Connecting to session...</span>
            </div>
          </div>
        )}

        <Card
          className="shadow-lg border border-gray-200 dark:border-neutral-800
                     bg-white dark:bg-neutral-900"
        >
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Clock className="h-5 w-5" style={{ color: BRAND }} />
              <Badge
                variant="secondary"
                className="text-xs md:text-sm font-medium
                           bg-gray-100 text-gray-700
                           dark:bg-neutral-800 dark:text-gray-200 dark:border-neutral-700"
              >
                Waiting Room
              </Badge>
            </div>

            <CardTitle className="text-2xl font-bold">
              {webinar?.title || 'Webinar Session'}
            </CardTitle>

            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {webinar?.description || 'Session will begin shortly'}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Countdown */}
            <div
              className="rounded-lg p-4 text-center border"
              style={{
                backgroundColor: BRAND,
                borderColor: BRAND_DARK,
              }}
            >
              <div className="text-sm font-medium text-white mb-1">
                Session starts in
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {timeLeft}
              </div>
            </div>

            {/* Session Details */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    Session Time
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {formattedDate}
                  </div>
                </div>
              </div>

              {!!webinar?.presenters?.length && (
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      Hosted by
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
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
                <Badge
                  variant="outline"
                  className="text-xs capitalize
                             border-gray-300 text-gray-700
                             dark:border-neutral-700 dark:text-gray-200"
                >
                  {session.status}
                </Badge>
              </div>
            </div>

            {/* Info Message */}
            <div
              className="rounded-lg p-4 border"
              style={{
                backgroundColor: BRAND_DARK,
                borderColor: '#158a46', // deeper accent for separation
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: '#9BE7B8' }}
                  />
                </div>
                <div>
                  <div className="font-medium text-white">
                    You&apos;ll be automatically redirected
                  </div>
                  <div className="text-sm mt-1" style={{ color: '#D0F6DE' }}>
                    When the session starts, you&apos;ll be taken to the live room
                    automatically. Please don&apos;t close this window.
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
