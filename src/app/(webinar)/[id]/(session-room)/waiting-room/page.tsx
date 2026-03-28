'use client'

import { useEffect, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { Loader2 } from 'lucide-react'
import CalendarButton from '@/webinar/components/CalendarButton'
import BookmarkButton from '@/webinar/components/BookmarkButton'
import { useWebinar } from '@/webinar/hooks'
import { useSessionPresence } from '@/broadcast/hooks'
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { useAttendeeSession } from '@/attendee-session/hooks/use-attendee-session'
import { useRouter } from 'next/navigation'
import { SessionDetailCard } from '@/webinar/components/SessionDetailCard'
import { WebinarDetailCard } from '@/webinar/components/WebinarDetailCard'

export default function WaitingRoomPage() {
  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const hasRedirectedRef = useRef(false)

  const router = useRouter()
  const { session, webinar, broadcastServiceToken } = useWebinar()
  const { joinUrl } = useAttendeeSession()
  const { markRoom } = useSessionPresence()

  useEffect(() => {
    markRoom('waiting_room_entered')
  }, [markRoom])

  useEffect(() => {
    if (!session) return
    const update = () => {
      const now = DateTime.local()
      const sessionTime = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' })
      const diff = sessionTime.diff(now, ['days', 'hours', 'minutes', 'seconds'])
      setTimeLeft(
        diff.toMillis() <= 0
          ? 'Starting soon...'
          : `${diff.days}d ${diff.hours}h ${diff.minutes}m ${Math.floor(diff.seconds)}s`
      )
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [session])

  useEffect(() => {
    if (!session || hasRedirectedRef.current) return
    if (session.status === WebinarSessionStatus.IN_PROGRESS && broadcastServiceToken?.stream) {
      hasRedirectedRef.current = true
      setIsRedirecting(true)
      router.replace(`/${session.id}/live?ready=1`)
    }
  }, [session, router, broadcastServiceToken])

  if (!session || !webinar) {
    return <WaitingRoomShimmer title="Opening waiting room..." />
  }

  const sessionDt = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' })
  const formattedDate = sessionDt.toFormat('cccc, LLLL d yyyy, h:mm a')
  const timezone = sessionDt.offsetNameLong ?? session.timezone ?? sessionDt.zoneName

  return (
    <div>
      {/* Redirecting overlay */}
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl bg-white/90 dark:bg-slate-800/90 shadow-xl px-8 py-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span className="text-base font-medium text-gray-800 dark:text-slate-200">Connecting to session...</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Left — Webinar details */}
          <WebinarDetailCard
            webinar={webinar}
            badge={
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-3 py-1 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                Waiting Room
              </span>
            }
          />

          {/* Right — Countdown & info */}
          <div className="order-first md:order-last rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/60 dark:border-slate-700 p-6 space-y-5">
            {/* Countdown */}
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-center shadow-inner">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide mb-2">
                Session starts in
              </p>
              <p className="text-3xl font-bold text-white font-mono tracking-tight">
                {timeLeft}
              </p>
            </div>

            <hr className="border-gray-100 dark:border-slate-700" />

            <SessionDetailCard
              formattedDate={formattedDate}
              timezone={timezone}
              clockContent={
                <>
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">You&apos;ll be automatically redirected</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                    When the session starts, you&apos;ll be taken to the live room. Please don&apos;t close this window.
                  </p>
                </>
              }
            />

            <hr className="border-gray-100 dark:border-slate-700" />

            <CalendarButton
              title={webinar.title}
              description={webinar.description ?? ''}
              startIso={session.scheduled_start}
              timezone={session.timezone || 'utc'}
              uid={session.id}
              url={joinUrl}
            />
            <BookmarkButton livePath={joinUrl} />
          </div>

        </div>
      </div>
    </div>
  )
}
