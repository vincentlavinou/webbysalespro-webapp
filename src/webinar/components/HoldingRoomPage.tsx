'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { DateTime } from 'luxon'
import { Hand, Loader2 } from 'lucide-react'
import { motion, useAnimation } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useManualWakeLock } from '@/hooks/use-manual-wake-lock'
import { useAttendeeSession } from '@/attendee-session/hooks/use-attendee-session'
import { useSessionPresence } from '@/broadcast/hooks'
import { useWebinar } from '@/webinar/hooks'
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer'
import { SessionDetailCard } from '@/webinar/components/SessionDetailCard'
import { WebinarDetailCard } from '@/webinar/components/WebinarDetailCard'
import CalendarButton from '@/webinar/components/CalendarButton'
import BookmarkButton from '@/webinar/components/BookmarkButton'
import { WebinarSessionStatus } from '@/webinar/service/enum'

const LIVE_REDIRECT_BASE_DELAY_MS = 10_000
const LIVE_REDIRECT_JITTER_MS = 5_000

type HoldingRoomPageProps = {
  loadingTitle: string
  presenceRoom: 'waiting_room_entered' | 'early_access_room'
  roomLabel: string
}

export function HoldingRoomPage({
  loadingTitle,
  presenceRoom,
  roomLabel,
}: HoldingRoomPageProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const hasRedirectedRef = useRef(false)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const promptControls = useAnimation()

  const { isActive, request, status } = useManualWakeLock()
  const router = useRouter()
  const { session, webinar, broadcastServiceToken } = useWebinar()
  const { joinUrl } = useAttendeeSession()
  const { markRoom } = useSessionPresence()

  useEffect(() => {
    if (isActive) return

    const pulse = () => {
      promptControls.start({
        opacity: [1, 0.25, 1, 0.25, 1],
        scale: [1, 1.03, 1, 1.03, 1],
        transition: { duration: 0.75, ease: 'easeInOut' },
      })
    }

    const timers = [
      setTimeout(pulse, 1200),
      setTimeout(pulse, 7000),
      setTimeout(pulse, 15000),
    ]

    return () => timers.forEach(clearTimeout)
  }, [isActive, promptControls])

  useEffect(() => {
    markRoom(presenceRoom)
  }, [markRoom, presenceRoom])

  useEffect(() => {
    if (!session) return

    const update = () => {
      const now = DateTime.local()
      const sessionTime = DateTime.fromISO(session.scheduled_start, {
        zone: session.timezone || 'utc',
      })
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
    const sessionId = session?.id
    const canRedirectToLive =
      session?.status === WebinarSessionStatus.IN_PROGRESS && !!broadcastServiceToken?.stream

    if (!sessionId || hasRedirectedRef.current || !canRedirectToLive || redirectTimeoutRef.current) {
      return
    }

    const jitter = Math.round((Math.random() * 2 - 1) * LIVE_REDIRECT_JITTER_MS)
    const delay = LIVE_REDIRECT_BASE_DELAY_MS + jitter

    redirectTimeoutRef.current = setTimeout(() => {
      hasRedirectedRef.current = true
      redirectTimeoutRef.current = null
      setIsRedirecting(true)
      router.replace(`/${sessionId}/live?ready=1`)
    }, delay)

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
        redirectTimeoutRef.current = null
      }
    }
  }, [broadcastServiceToken?.stream, router, session?.id, session?.status])

  if (!session || !webinar) {
    return <WaitingRoomShimmer title={loadingTitle} />
  }

  const sessionDt = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' })
  const formattedDate = sessionDt.toFormat('cccc, LLLL d yyyy, h:mm a')
  const timezone = sessionDt.offsetNameLong ?? session.timezone ?? sessionDt.zoneName
  const thumbnail = webinar.media?.find(
    (media) => media.file_type === 'image' && media.field_type === 'thumbnail'
  )

  return (
    <div>
      {isRedirecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/90 px-8 py-6 shadow-xl dark:border-slate-700 dark:bg-slate-800/90">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span className="text-base font-medium text-gray-800 dark:text-slate-200">
              Connecting to session...
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-6 px-4 py-8 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <WebinarDetailCard
            webinar={webinar}
            badge={
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                </span>
                {roomLabel}
              </span>
            }
          />
        </div>

        <div className="order-1 space-y-6 md:order-2">
          <section className="overflow-hidden rounded-3xl border border-white/60 bg-slate-950 shadow-xl dark:border-slate-700">
            <div className="relative aspect-video">
              {thumbnail?.file_url ? (
                <>
                  <Image
                    src={thumbnail.file_url}
                    alt={`${webinar.title} thumbnail`}
                    fill
                    priority
                    className="scale-105 object-cover blur-md"
                  />
                  <div className="absolute inset-0 bg-slate-950/45" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
              )}

              <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  {isActive ? (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                      </span>
                      {roomLabel}
                    </span>
                  ) : (
                    <span />
                  )}
                </div>

                <div className="flex flex-1 items-center justify-center">
                  {isActive ? (
                    <p className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                      {timeLeft}
                    </p>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      className="size-18 rounded-full bg-white text-slate-950 shadow-lg hover:bg-emerald-50 sm:size-20"
                      onClick={() => void request()}
                      aria-label="Tap to reveal the countdown"
                    >
                      <Hand className="size-8 sm:size-9" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1 text-center">
                  {!isActive ? (
                    <motion.p animate={promptControls} className="text-sm font-semibold text-white/90">
                      Tap to see...
                    </motion.p>
                  ) : null}
                  {status === 'unsupported' ? (
                    <p className="text-xs text-amber-200/90">
                      Keep-awake could not be enabled on this browser.
                    </p>
                  ) : null}
                  {status === 'error' ? (
                    <p className="text-xs text-amber-200/90">
                      Keep-awake was blocked. Keep this tab in the foreground for best results.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/80">
            <div className="space-y-5">
              <SessionDetailCard
                formattedDate={formattedDate}
                timezone={timezone}
                clockContent={
                  <>
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                      You&apos;ll be automatically redirected
                    </p>
                    <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
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
          </section>
        </div>
      </div>
    </div>
  )
}
