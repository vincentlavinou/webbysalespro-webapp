import { getPublicWebinarState } from '@/webinar/service'
import { allowsManualSessionSelection } from '@/webinar/service/guards'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { DefaultRegistrationForm } from './form'
import { NoAvailableSessionsMessage } from '@/webinar/components/NoAvailableSessionsMessage'
import { WebinarDetailCard } from '@/webinar/components/WebinarDetailCard'
import { PausedWebinarNotice } from '@/webinar/components/PausedWebinarNotice'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface DefaultRegistrationPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        token: string
    }>
}

export async function generateMetadata({ params }: DefaultRegistrationPageProps): Promise<Metadata> {
    const webinarId = (await params).id
    const webinarState = await getPublicWebinarState(webinarId, { fresh: true })
    if (webinarState.kind === 'not_found') {
      return {
        title: 'Webinar Registration',
        description: 'Register now to attend this exciting webinar session.',
      }
    }

    if (webinarState.kind === 'paused') {
      return {
        title: 'Webinar Registration Paused',
        description: webinarState.pauseInfo.message || 'Registration is temporarily paused for this webinar.',
      }
    }

    const webinar = webinarState.webinar

  return {
    title: webinar.title ?? 'Webinar Registration',
    description: webinar.description ?? 'Register now to attend this exciting webinar session.',
    openGraph: {
      title: webinar.title,
      description: webinar.description,
      images: webinar.media
        ?.filter((m) => m.file_type === 'image' && m.field_type === 'thumbnail')
        .map((m) => ({ url: m.file_url })) ?? [],
    },
    twitter: {
      card: 'summary_large_image',
      title: webinar.title,
      description: webinar.description,
    },
  }
}

export default async function DefaultRegistrationPage(props: DefaultRegistrationPageProps) {
    
    const webinarId = (await props.params).id
    const webinarState = await getPublicWebinarState(webinarId, { fresh: true })
    if (webinarState.kind === 'not_found') {
      notFound()
    }

    if (webinarState.kind === 'paused') {
      return (
        <div className="px-4 pb-8">
          <div className="mx-auto max-w-3xl pt-20">
            <PausedWebinarNotice pauseInfo={webinarState.pauseInfo} />
          </div>
        </div>
      )
    }

    const webinar = webinarState.webinar
    const sessions = webinar.series?.sessions || []
    const allowsSessionSelection = allowsManualSessionSelection(webinar)
    const hasLiveSession = !allowsSessionSelection && sessions.some(
      (session) => session.status === WebinarSessionStatus.IN_PROGRESS
    )
    const theme = webinar.registration_settings?.theme
    const backgroundColor = theme?.background_color ?? undefined
    const primaryColor = theme?.primary_color ?? undefined
    const secondaryColor = theme?.secondary_color ?? undefined
    const secondaryBackgroundColor = theme?.secondary_background_color ?? undefined
    const buttonTextColor = theme?.button_text_color ?? undefined

  return (
    <div className="px-4 pb-8" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left — Webinar details */}
        <WebinarDetailCard
          webinar={webinar}
          primaryColor={primaryColor}
          backgroundColor={backgroundColor}
          secondaryBackgroundColor={secondaryBackgroundColor}
        />

        {/* Right — Registration form */}
        <div className="order-1 md:order-2 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/60 dark:border-slate-700 p-6">
          {hasLiveSession ? (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-600 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              We are live right now
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-700 dark:text-slate-300 uppercase tracking-wide mb-4">
              {allowsSessionSelection ? `Reserve your spot for ${webinar.title}` : `Register for ${webinar.title}`}
            </p>
          )}
          {sessions && sessions[0] ? (
            <DefaultRegistrationForm
              webinarPromise={Promise.resolve(webinar)}
              webinarId={webinar.id}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              secondaryBackgroundColor={secondaryBackgroundColor}
              buttonTextColor={buttonTextColor}
            />
          ) : (
            <NoAvailableSessionsMessage />
          )}
        </div>

      </div>
    </div>
  )
}
