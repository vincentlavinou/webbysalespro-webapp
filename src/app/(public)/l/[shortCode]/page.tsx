import { Link2Off } from 'lucide-react'
import { redirect } from 'next/navigation'

import { resolveShortLink } from '@/webinar/service/short-link'
import { RetryShortLinkButton } from './RetryShortLinkButton'

type ShortLinkPageProps = {
  params: Promise<{
    shortCode: string
  }>
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
          a newer link, or try this link again.
        </p>

        <RetryShortLinkButton />
      </div>
    </div>
  )
}
