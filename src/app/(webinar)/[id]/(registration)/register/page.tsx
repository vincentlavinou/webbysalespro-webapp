import { getWebinar } from '@/webinar/service'
import { allowsManualSessionSelection, isWebinarPayload } from '@/webinar/service/guards'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { DefaultRegistrationForm } from './form'
import { NoAvailableSessionsMessage } from '@/webinar/components/NoAvailableSessionsMessage'
import { WebinarDetailCard } from '@/webinar/components/WebinarDetailCard'
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
    const webinar = await getWebinar(webinarId, { fresh: true })
    if (!isWebinarPayload(webinar)) {
      return {
        title: 'Webinar Registration',
        description: 'Register now to attend this exciting webinar session.',
      }
    }

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
    const webinar = await getWebinar(webinarId, { fresh: true })
    if (!isWebinarPayload(webinar)) {
      notFound()
    }
    const sessions = webinar.series?.sessions || []
    const allowsSessionSelection = allowsManualSessionSelection(webinar)
    const hasLiveSession = !allowsSessionSelection && sessions.some(
      (session) => session.status === WebinarSessionStatus.IN_PROGRESS
    )

  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left — Webinar details */}
        <WebinarDetailCard
          webinar={webinar}
          badge={
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-3 py-1 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              Free Online Webinar
            </span>
          }
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
            <DefaultRegistrationForm webinar={webinar} />
          ) : (
            <NoAvailableSessionsMessage />
          )}
        </div>

      </div>
    </div>
  )
}
