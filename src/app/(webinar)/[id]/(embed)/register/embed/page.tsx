import Script from 'next/script'
import { notFound } from 'next/navigation'
import { getWebinar, getRegistrationEmbedConfig } from '@/webinar/service/action'
import { isWebinarPayload, allowsManualSessionSelection } from '@/webinar/service/guards'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { DefaultRegistrationForm } from '../../../(registration)/register/form'
import { NoAvailableSessionsMessage } from '@/webinar/components/NoAvailableSessionsMessage'

interface EmbedRegistrationPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ source?: string }>
}

export default async function EmbedRegistrationPage({ params, searchParams }: EmbedRegistrationPageProps) {
  const { id } = await params
  const { source } = await searchParams

  const [webinar, embedConfig] = await Promise.all([
    getWebinar(id, { fresh: true }),
    source ? getRegistrationEmbedConfig(id, source) : Promise.resolve(null),
  ])

  if (!isWebinarPayload(webinar)) notFound()

  const sessions = webinar.series?.sessions ?? []
  const allowsSessionSelection = allowsManualSessionSelection(webinar)
  const hasLiveSession =
    !allowsSessionSelection &&
    sessions.some((s) => s.status === WebinarSessionStatus.IN_PROGRESS)

  const primaryColor = embedConfig?.primary_color ?? undefined
  const secondaryColor = embedConfig?.secondary_color ?? undefined
  const bgColor = embedConfig?.background_color ?? undefined
  const embedSuccessUrl = embedConfig?.success_url ?? undefined
  const headerScripts = embedConfig?.header_scripts?.trim()

  return (
    <>
      {headerScripts ? (
        <Script
          id="embed-header-scripts"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: headerScripts }}
        />
      ) : null}

      <div className="p-4" style={bgColor ? { backgroundColor: bgColor } : undefined}>
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-6">
          {hasLiveSession ? (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              We are live right now
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              {allowsSessionSelection
                ? `Reserve your spot for ${webinar.title}`
                : `Register for ${webinar.title}`}
            </p>
          )}
          {sessions[0] ? (
            <DefaultRegistrationForm
              webinar={webinar}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              embedSource={source}
              embedSuccessUrl={embedSuccessUrl}
            />
          ) : (
            <NoAvailableSessionsMessage />
          )}
        </div>
      </div>
    </>
  )
}
