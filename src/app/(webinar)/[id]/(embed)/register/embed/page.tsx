import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getWebinar, getRegistrationEmbedConfig } from '@/webinar/service/action'
import { isWebinarPayload, allowsManualSessionSelection } from '@/webinar/service/guards'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { DefaultRegistrationForm } from '../../../(registration)/register/form'
import { EmbedHeaderScripts } from '@/webinar/lib/embed-header-scripts'
import {
  EmbedRegistrationLoading,
} from './EmbedRegistrationLoading'
import type { Webinar } from '@/webinar/service'

interface EmbedRegistrationPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ source?: string }>
}

export default async function EmbedRegistrationPage({ params, searchParams }: EmbedRegistrationPageProps) {
  const { id } = await params
  const { source } = await searchParams

  return (
    <Suspense fallback={<EmbedRegistrationLoading />}>
      <EmbedRegistrationShell id={id} source={source} />
    </Suspense>
  )
}

async function EmbedRegistrationShell({ id, source }: { id: string; source?: string }) {
  const webinarPromise = getWebinar(id)
  const embedConfig = source ? await getRegistrationEmbedConfig(id, source) : null
  const primaryColor = embedConfig?.primary_color ?? undefined
  const secondaryColor = embedConfig?.secondary_color ?? undefined
  const bgColor = embedConfig?.background_color ?? undefined
  const embedSuccessUrl = embedConfig?.success_url ?? undefined
  const headerScripts = embedConfig?.header_scripts?.trim()

  return (
    <>
      {headerScripts ? <EmbedHeaderScripts value={headerScripts} /> : null}

      <div className="p-4" style={bgColor ? { backgroundColor: bgColor } : undefined}>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Suspense fallback={<div className="mx-auto mb-4 h-4 w-52 animate-pulse rounded bg-gray-200" />}>
            <EmbedRegistrationHeading webinarPromise={webinarPromise} />
          </Suspense>
          <DefaultRegistrationForm
            webinarPromise={webinarPromise}
            webinarId={id}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            embedSource={source}
            embedSuccessUrl={embedSuccessUrl}
          />
        </div>
      </div>
    </>
  )
}

interface EmbedRegistrationHeadingProps {
  webinarPromise: Promise<Webinar>
}

async function EmbedRegistrationHeading({ webinarPromise }: EmbedRegistrationHeadingProps) {
  const webinar = await webinarPromise

  if (!isWebinarPayload(webinar)) notFound()

  const sessions = webinar.series?.sessions ?? []
  const allowsSessionSelection = allowsManualSessionSelection(webinar)
  const hasLiveSession =
    !allowsSessionSelection &&
    sessions.some((session) => session.status === WebinarSessionStatus.IN_PROGRESS)

  if (hasLiveSession) {
    return (
      <div className="mb-4 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
          </span>
          We are live right now
        </div>
      </div>
    )
  }

  return (
    <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-gray-700">
      {allowsSessionSelection
        ? `Reserve your spot for ${webinar.title}`
        : `Register for ${webinar.title}`}
    </p>
  )
}
