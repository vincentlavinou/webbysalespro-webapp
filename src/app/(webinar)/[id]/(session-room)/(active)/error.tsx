'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { webinarAppUrl } from '@/webinar/service'

function getSessionIdFromPathname(pathname: string) {
  const [sessionId] = pathname.split('/').filter(Boolean)
  return sessionId ?? null
}

export default function ActiveSessionError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const liveRecoveryPath = useMemo(() => {
    const sessionId = getSessionIdFromPathname(pathname)
    if (!sessionId) {
      return '/webinars'
    }

    const suffix = searchParams.toString()
    return `/${sessionId}/live${suffix ? `?${suffix}` : ''}`
  }, [pathname, searchParams])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.location.replace(`${webinarAppUrl}${liveRecoveryPath}`)
    }, 1500)

    return () => window.clearTimeout(timeoutId)
  }, [liveRecoveryPath])

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-white/60 bg-white/85 p-8 text-center shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/85">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          We hit a problem opening this room.
        </h1>
        <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
          We&apos;re sending you back into the webinar flow now so you still have a way in.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => window.location.replace(`${webinarAppUrl}${liveRecoveryPath}`)}>
            Rejoin Webinar
          </Button>
          <Button variant="outline" onClick={reset}>
            Retry This Room
          </Button>
          <Button asChild variant="ghost">
            <Link href="/webinars">Browse Webinars</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
