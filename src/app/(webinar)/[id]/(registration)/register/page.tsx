import { getWebinar } from '@/webinar/service'
import { allowsManualSessionSelection, isWebinarPayload } from '@/webinar/service/guards'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { DefaultRegistrationForm } from './form'
import { NoAvailableSessionsMessage } from '@/webinar/components'
import Image from 'next/image'
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

    const thumbnail = webinar.media.find(
        (media) =>
          media.file_type === 'image' &&
          media.field_type === 'thumbnail'
      )

  return (
    <div className="px-4 pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left — Webinar details */}
        <div className="order-2 md:order-1 rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/60 dark:border-slate-700">
          {thumbnail?.file_url && (
            <div className="relative w-full h-[220px]">
              <Image src={thumbnail.file_url} alt="Webinar thumbnail" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            </div>
          )}
          <div className="p-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-full px-3 py-1 mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              Free Online Webinar
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
              {webinar.title}
            </h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">
              {webinar.description}
            </p>

            {/* Presenters */}
            {webinar.presenters?.length > 0 && (
              <>
                <hr className="border-gray-100 dark:border-slate-700 my-5" />
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
                  Your {webinar.presenters.length === 1 ? 'Presenter' : 'Presenters'}
                </p>
                <div className="flex flex-col gap-3">
                  {webinar.presenters.map((presenter) => {
                    const avatar = presenter.media?.find(
                      (m) => m.file_type === 'image' && m.field_type === 'profile'
                    )
                    return (
                      <div key={presenter.id} className="flex items-center gap-3">
                        <div className="relative h-11 w-11 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0 ring-2 ring-white dark:ring-slate-600 shadow">
                          {avatar?.file_url ? (
                            <Image src={avatar.file_url} alt={presenter.name} fill className="object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-emerald-700 font-bold text-sm">
                              {presenter.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{presenter.name}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

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
