'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { DateTime } from 'luxon'
import { Loader2, Play } from 'lucide-react'
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

  const { isActive, request, status } = useManualWakeLock()
  const router = useRouter()
  const { session, webinar, broadcastServiceToken } = useWebinar()
  const { joinUrl } = useAttendeeSession()
  const { markRoom } = useSessionPresence()

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
    if (!session || hasRedirectedRef.current) return

    if (session.status === WebinarSessionStatus.IN_PROGRESS && broadcastServiceToken?.stream) {
      hasRedirectedRef.current = true
      setIsRedirecting(true)
      router.replace(`/${session.id}/live?ready=1`)
    }
  }, [broadcastServiceToken, router, session])

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-white/90 px-8 py-6 shadow-xl dark:bg-slate-800/90">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span className="text-base font-medium text-gray-800 dark:text-slate-200">
              Connecting to session...
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <section className="overflow-hidden rounded-3xl border border-white/60 bg-slate-950 shadow-xl dark:border-slate-700">
          <div className="relative aspect-video">
            {thumbnail?.file_url ? (
              <>
                <Image
                  src={thumbnail.file_url}
                  alt={`${webinar.title} thumbnail`}
                  fill
                  priority
                  className="object-cover blur-md scale-105"
                />
                <div className="absolute inset-0 bg-slate-950/45" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black" />
            )}

            <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  </span>
                  {roomLabel}
                </span>
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
                    aria-label="Keep screen awake"
                  >
                    <Play className="size-8 fill-current sm:size-9" />
                  </Button>
                )}
              </div>

              <div className="space-y-1 text-center">
                {!isActive ? (
                  <p className="text-sm text-white/85">
                    Press play to keep this page active while you wait for the session to start.
                  </p>
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
                  <p className="mt-0.5 text-xs text-emerald-600 dark:text-emerald-500">
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
    </div>
  )
}
