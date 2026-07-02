import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getPublicWebinarState, getRegistrationEmbedConfig } from '@/webinar/service/action'
import { allowsManualSessionSelection } from '@/webinar/service/guards'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { DefaultRegistrationForm } from '../../../(registration)/register/form'
import { EmbedHeaderScripts } from '@/webinar/lib/embed-header-scripts'
import {
  EmbedRegistrationLoading,
} from './EmbedRegistrationLoading'
import type { Webinar } from '@/webinar/service'
import { PausedWebinarNotice } from '@/webinar/components'

interface EmbedRegistrationPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    source?: string
    background_color?: string
    primary_color?: string
    secondary_color?: string
    secondary_background_color?: string
    button_text_color?: string
  }>
}

export default async function EmbedRegistrationPage({ params, searchParams }: EmbedRegistrationPageProps) {
  const { id } = await params
  const {
    source,
    background_color: backgroundColor,
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    secondary_background_color: secondaryBackgroundColor,
    button_text_color: buttonTextColor,
  } = await searchParams
  const colorOverrides = {
    backgroundColor: normalizeColorOverride(backgroundColor),
    primaryColor: normalizeColorOverride(primaryColor),
    secondaryColor: normalizeColorOverride(secondaryColor),
    secondaryBackgroundColor: normalizeColorOverride(secondaryBackgroundColor),
    buttonTextColor: normalizeColorOverride(buttonTextColor),
  }

  return (
    <Suspense
      fallback={
        <EmbedRegistrationLoading
          backgroundColor={colorOverrides.backgroundColor}
          primaryColor={colorOverrides.primaryColor}
        />
      }
    >
      <EmbedRegistrationShell id={id} source={source} colorOverrides={colorOverrides} />
    </Suspense>
  )
}

interface EmbedColorOverrides {
  backgroundColor?: string
  primaryColor?: string
  secondaryColor?: string
  secondaryBackgroundColor?: string
  buttonTextColor?: string
}

function normalizeColorOverride(color?: string) {
  const normalizedColor = color?.trim()
  return normalizedColor || undefined
}

async function EmbedRegistrationShell({
  id,
  source,
  colorOverrides,
}: {
  id: string
  source?: string
  colorOverrides: EmbedColorOverrides
}) {
  const webinarState = await getPublicWebinarState(id, { fresh: true })
  const embedConfig = source ? await getRegistrationEmbedConfig(id, source) : null
  const primaryColor = colorOverrides.primaryColor ?? embedConfig?.primary_color ?? undefined
  const secondaryColor = colorOverrides.secondaryColor ?? embedConfig?.secondary_color ?? undefined
  const secondaryBackgroundColor =
    colorOverrides.secondaryBackgroundColor ?? embedConfig?.secondary_background_color ?? undefined
  const buttonTextColor = colorOverrides.buttonTextColor ?? embedConfig?.button_text_color ?? undefined
  const backgroundColor = colorOverrides.backgroundColor ?? embedConfig?.background_color ?? undefined
  const embedSuccessUrl = embedConfig?.success_url ?? undefined
  const headerScripts = embedConfig?.header_scripts?.trim()

  if (webinarState.kind === "not_found") {
    notFound()
  }

  if (webinarState.kind === "paused") {
    return (
      <>
        {headerScripts ? <EmbedHeaderScripts value={headerScripts} /> : null}

        <div className="p-4" style={backgroundColor ? { backgroundColor } : undefined}>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <PausedWebinarNotice pauseInfo={webinarState.pauseInfo} title="Registration paused for this webinar" />
          </div>
        </div>
      </>
    )
  }

  const webinarPromise = Promise.resolve(webinarState.webinar)

  return (
    <>
      {headerScripts ? <EmbedHeaderScripts value={headerScripts} /> : null}

      <div className="p-4" style={backgroundColor ? { backgroundColor } : undefined}>
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <Suspense fallback={<div className="mx-auto mb-4 h-4 w-52 animate-pulse rounded bg-gray-200" />}>
            <EmbedRegistrationHeading webinarPromise={webinarPromise} />
          </Suspense>
          <DefaultRegistrationForm
            webinarPromise={webinarPromise}
            webinarId={id}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            secondaryBackgroundColor={secondaryBackgroundColor}
            buttonTextColor={buttonTextColor}
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
