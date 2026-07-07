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
  const hasNavigatedToWaitingRef = useRef(false)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const promptControls = useAnimation()

  const { isActive, request, status } = useManualWakeLock()
  const router = useRouter()
  const { session, webinar } = useWebinar()
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
    const canRedirectToLive = session?.status === WebinarSessionStatus.IN_PROGRESS

    if (!sessionId || hasRedirectedRef.current || !canRedirectToLive || redirectTimeoutRef.current) {
      return
    }

    const jitter = Math.round(Math.random() * LIVE_REDIRECT_JITTER_MS)
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
  }, [router, session?.id, session?.status])

  // Early-access room only: once the waiting-room open time
  // (scheduled_start − waiting_room_start_time) is reached, send the attendee
  // back through the join route so the server re-resolves their token and drops
  // them in the correct room — waiting-room now, or live/completed if the
  // session has since moved on. Mirrors the room selection in join/live/route.ts.
  useEffect(() => {
    if (presenceRoom !== 'early_access_room') return
    if (!session || !webinar || !joinUrl) return

    const waitingRoomMinutes = webinar.settings?.waiting_room_start_time ?? 15
    const waitingRoomOpensAt = DateTime.fromISO(session.scheduled_start, {
      zone: session.timezone || 'utc',
    }).minus({ minutes: waitingRoomMinutes })

    const goToWaitingRoom = () => {
      // Fire once, and never yank a user already heading to /live.
      if (hasNavigatedToWaitingRef.current || hasRedirectedRef.current) return
      if (waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()) return
      hasNavigatedToWaitingRef.current = true
      setIsRedirecting(true)
      // Hard navigation: /join/live is a route handler, not a client route.
      window.location.assign(joinUrl)
    }

    goToWaitingRoom()

    // Poll at the countdown cadence rather than one long timer, which a
    // backgrounded tab would throttle; re-check immediately on refocus too.
    const interval = setInterval(goToWaitingRoom, 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') goToWaitingRoom()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [presenceRoom, session, webinar, joinUrl])

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/95 px-8 py-6 text-card-foreground shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-base font-medium text-foreground">
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
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                {roomLabel}
              </span>
            }
          />
        </div>

        <div className="order-1 space-y-6 md:order-2">
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
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
                  <div className="absolute inset-0 bg-background/55" />
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-chart-2 to-chart-3" />
              )}

              <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  {isActive ? (
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-background/20 bg-background/20 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
                      </span>
                      {roomLabel}
                    </span>
                  ) : (
                    <span />
                  )}
                </div>

                <div className="flex flex-1 items-center justify-center">
                  {isActive ? (
                    <p className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
                      {timeLeft}
                    </p>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      className="size-18 rounded-full bg-background text-foreground shadow-lg hover:bg-accent hover:text-accent-foreground sm:size-20"
                      onClick={() => void request()}
                      aria-label="Tap to reveal the countdown"
                    >
                      <Hand className="size-8 sm:size-9" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1 text-center">
                  {!isActive ? (
                    <motion.p animate={promptControls} className="text-sm font-semibold text-primary-foreground/90">
                      Tap to see...
                    </motion.p>
                  ) : null}
                  {status === 'unsupported' ? (
                    <p className="text-xs text-primary-foreground/80">
                      Keep-awake could not be enabled on this browser.
                    </p>
                  ) : null}
                  {status === 'error' ? (
                    <p className="text-xs text-primary-foreground/80">
                      Keep-awake was blocked. Keep this tab in the foreground for best results.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur-md">
            <div className="space-y-5">
              <SessionDetailCard
                formattedDate={formattedDate}
                timezone={timezone}
                clockContent={
                  <>
                    <p className="text-sm font-medium text-foreground">
                      You&apos;ll be automatically redirected
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      When the session starts, you&apos;ll be taken to the live room. Please don&apos;t close this window.
                    </p>
                  </>
                }
              />

              <hr className="border-border" />

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
