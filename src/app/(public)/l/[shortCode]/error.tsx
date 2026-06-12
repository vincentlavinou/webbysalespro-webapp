'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

import { RetryShortLinkButton } from './RetryShortLinkButton'

export default function ShortLinkError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { area: 'short-link', step: 'resolve' },
    })
  }, [error])

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          We couldn&apos;t open your webinar link
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          The service may be temporarily unavailable. Try this link again. You
          will remain on this page while we retry it.
        </p>

        <RetryShortLinkButton onRetry={reset} />

        {error.digest ? (
          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  )
}
