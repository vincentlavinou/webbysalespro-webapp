'use client'

import { useEffect, useMemo } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { usePathname } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'

import { Button } from '@/components/ui/button'
import { webinarAppUrl } from '@/webinar/service'

function getSessionIdFromPathname(pathname: string) {
  const [sessionId] = pathname.split('/').filter(Boolean)
  return sessionId ?? null
}

export default function LiveExperienceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()

  const sessionId = useMemo(() => getSessionIdFromPathname(pathname), [pathname])

  useEffect(() => {
    console.error('[live-experience-error]', error)
    Sentry.captureException(error, {
      tags: { area: 'live-experience' },
      extra: { sessionId },
    })
  }, [error, sessionId])

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-white/60 bg-white/85 p-8 text-center shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/85">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          We hit a problem loading the live stream.
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
          Try again. If it still doesn&apos;t load, re-click the webinar link
          from your email or text message, or check your email for the
          registration link.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            onClick={reset}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          {sessionId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                window.location.replace(`${webinarAppUrl}/${sessionId}/live`)
              }
            >
              Reload Live Stream
            </Button>
          ) : null}
        </div>

        {error.digest ? (
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  )
}
