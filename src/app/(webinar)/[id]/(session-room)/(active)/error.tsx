'use client'

import { useEffect, useMemo } from 'react'
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
      return null
    }

    const suffix = searchParams.toString()
    return `/${sessionId}/live${suffix ? `?${suffix}` : ''}`
  }, [pathname, searchParams])

  useEffect(() => {
    if (!liveRecoveryPath) return

    const timeoutId = window.setTimeout(() => {
      window.location.replace(`${webinarAppUrl}${liveRecoveryPath}`)
    }, 1500)

    return () => window.clearTimeout(timeoutId)
  }, [liveRecoveryPath])

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-card/90 p-8 text-center shadow-xl backdrop-blur-md">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <h1 className="text-2xl font-bold text-foreground">
          We hit a problem opening this room.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {liveRecoveryPath
            ? "We're sending you back into the webinar flow now so you still have a way in."
            : 'Re-click the webinar link from your email or text message, or check your email for the registration link.'}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {liveRecoveryPath ? (
            <Button onClick={() => window.location.replace(`${webinarAppUrl}${liveRecoveryPath}`)}>
              Rejoin Webinar
            </Button>
          ) : null}
          <Button variant="outline" onClick={reset}>
            Retry This Room
          </Button>
        </div>
      </div>
    </div>
  )
}
