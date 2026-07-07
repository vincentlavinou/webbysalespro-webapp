'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error]', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(31,29,255,0.16),_transparent_40%),linear-gradient(180deg,_oklch(0.99_0.003_277)_0%,_oklch(0.962_0.008_277)_100%)] text-slate-950 antialiased dark:bg-[radial-gradient(circle_at_top,_rgba(31,29,255,0.18),_transparent_35%),linear-gradient(180deg,_oklch(0.16_0.018_277)_0%,_oklch(0.205_0.022_277)_100%)] dark:text-slate-50">
        <main className="flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-xl rounded-3xl border border-white/70 bg-white/90 p-8 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/85">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              Something went wrong.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              We hit an unexpected client error. Try the page again. If it
              still fails, re-click the webinar link from your email or text
              message, or check your email for the registration link.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button onClick={reset} className="bg-primary hover:bg-primary/90">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>

            {error.digest ? (
              <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                Reference: {error.digest}
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  )
}
