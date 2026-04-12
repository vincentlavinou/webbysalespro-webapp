'use client'

import { useEffect, useRef, useState } from 'react'

const webinarApiUrl =
  process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ??
  'https://api.webisalespro.com/api'

type UnsubscribeStatus = 'loading' | 'success' | 'error'

type UnsubscribeContentProps = {
  token: string | null
}

export default function UnsubscribeContent({
  token,
}: UnsubscribeContentProps) {
  const hasAttempted = useRef(false)
  const [status, setStatus] = useState<UnsubscribeStatus>('loading')

  useEffect(() => {
    if (hasAttempted.current) {
      return
    }

    hasAttempted.current = true

    if (!token) {
      setStatus('error')
      return
    }

    void fetch(`${webinarApiUrl}/v2/messaging/unsubscribe/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })
      .then(() => {
        setStatus('success')
      })
      .catch(() => {
        setStatus('error')
      })
  }, [token])

  return (
    <section className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center px-4 py-16">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {status === 'success' ? "You've been unsubscribed" : 'Email Preferences'}
        </h1>

        {status === 'loading' && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Updating your email preferences...
          </p>
        )}

        {status === 'success' && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            You will no longer receive these emails.
          </p>
        )}

        {status === 'error' && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Something went wrong.
          </p>
        )}
      </div>
    </section>
  )
}
