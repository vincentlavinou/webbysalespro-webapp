'use client'

import { useEffect, useRef, useState } from 'react'
import { DateTime } from 'luxon'
import { Loader2, CalendarDays, Clock } from 'lucide-react'
import CalendarButton from '@/webinar/components/CalendarButton'
import BookmarkButton from '@/webinar/components/BookmarkButton'
import { useWebinar } from '@/webinar/hooks'
import { useSessionPresence } from '@/broadcast/hooks'
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function EarlyAccessRoomPage() {

  const [timeLeft, setTimeLeft] = useState<string>('')
  const [isRedirecting, setIsRedirecting] = useState(false)
  const hasRedirectedRef = useRef(false)

  const router = useRouter()
  const { session, webinar, token, broadcastServiceToken } = useWebinar()
  const { markRoom } = useSessionPresence(token || '')

  useEffect(() => {
    if (token) markRoom('early_access_room')
  }, [token, markRoom])

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
    if (!session || !token || hasRedirectedRef.current) return
    if (session.status === WebinarSessionStatus.IN_PROGRESS && broadcastServiceToken?.stream) {
      hasRedirectedRef.current = true
      setIsRedirecting(true)
      router.replace(`/${session.id}/live?token=${token}&ready=1`)
    }
  }, [session, token, router, broadcastServiceToken])

  if (!session || !webinar || !token) {
    return <WaitingRoomShimmer title="Opening early access room..." />
  }

  const sessionDt = DateTime.fromISO(session.scheduled_start, { zone: session.timezone || 'utc' })
  const formattedDate = sessionDt.toFormat('cccc, LLLL d yyyy, h:mm a')
  const timezone = sessionDt.offsetNameLong

  const thumbnail = webinar.media?.find(
    (m) => m.file_type === 'image' && m.field_type === 'thumbnail'
  )

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
          <div className="order-last md:order-first rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/60 dark:border-slate-700">
            {thumbnail?.file_url && (
              <div className="relative w-full h-[220px]">
                <Image src={thumbnail.file_url} alt="Webinar thumbnail" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}
            <div className="p-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-3 py-1 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                Early Access Room
              </span>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
                {webinar.title}
              </h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">
                {webinar.description}
              </p>

              {webinar.presenters?.length > 0 && (
                <>
                  <hr className="border-gray-100 dark:border-slate-700 my-5" />
                  <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
                    Your {webinar.presenters.length === 1 ? 'Presenter' : 'Presenters'}
                  </p>
                  <div className="flex flex-col gap-3">
                    {webinar.presenters.map((presenter) => {
                      const avatar = presenter.media?.find(
                        (m) => m.file_type === 'image' && (m.field_type === 'thumbnail' || m.field_type === 'profile')
                      )
                      return (
                        <div key={presenter.id} className="flex items-center gap-3">
                          <div className="relative h-11 w-11 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0 ring-2 ring-white dark:ring-slate-600 shadow">
                            {avatar?.file_url ? (
                              <Image src={avatar.file_url} alt={presenter.name} fill className="object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-emerald-700 font-bold text-sm">
                                {presenter.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{presenter.name}</p>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

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

            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
              Session Details
            </p>

            <div className="flex items-start gap-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700 px-4 py-3">
              <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{formattedDate}</p>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{timezone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-4 py-3">
              <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">You&apos;ll be automatically redirected</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                  When the session starts, you&apos;ll be taken to the live room. Please don&apos;t close this window.
                </p>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-slate-700" />

            {token && (
              <CalendarButton
                title={webinar.title}
                description={webinar.description ?? ''}
                startIso={session.scheduled_start}
                timezone={session.timezone || 'utc'}
                uid={session.id}
                url={`/${session.id}/live?token=${token}`}
              />
            )}
            {token && (
              <BookmarkButton livePath={`/${session.id}/live?token=${token}`} />
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
