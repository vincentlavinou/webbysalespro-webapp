import Link from 'next/link'
import { Link2Off } from 'lucide-react'
import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { safeDecodeErrorPayload } from '@/lib/error'

const webinarApiUrl =
  process.env.WEBINAR_BASE_API_URL ??
  process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ??
  'https://api.webisalespro.com/api'

type ShortLinkPageProps = {
  params: Promise<{
    shortCode: string
  }>
}

type ShortLinkResolution =
  | { status: 'resolved'; url: string }
  | { status: 'expired' }

async function resolveShortLink(shortCode: string): Promise<ShortLinkResolution> {
  const response = await fetch(
    `${webinarApiUrl}/v2/short-links/${encodeURIComponent(shortCode)}/resolve/`,
    { cache: 'no-store' },
  )

  if (response.ok) {
    const payload: unknown = await response.json()
    const url =
      payload &&
      typeof payload === 'object' &&
      'url' in payload &&
      typeof payload.url === 'string'
        ? payload.url
        : null

    if (!url) {
      throw new Error('Short-link resolve response did not include a URL.')
    }

    return { status: 'resolved', url }
  }

  const { decoded, payload } = await safeDecodeErrorPayload(response)
  if (response.status === 404 && decoded && payload?.code === 'SL-001') {
    return { status: 'expired' }
  }

  throw new Error(
    payload?.detail ?? `Short-link resolution failed with status ${response.status}.`,
  )
}

export default async function ShortLinkPage({ params }: ShortLinkPageProps) {
  const { shortCode } = await params
  const resolution = await resolveShortLink(shortCode)

  if (resolution.status === 'resolved') {
    redirect(resolution.url)
  }

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <Link2Off className="h-7 w-7" aria-hidden="true" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          This link is no longer available
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          The link may have expired or is invalid. Check the original message for
          a newer link, or contact the webinar organizer.
        </p>

        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Return home</Link>
        </Button>
      </div>
    </div>
  )
}
