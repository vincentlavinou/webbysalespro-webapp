import Image from "next/image"
import { ReactNode } from "react"
import { Webinar } from "@/webinar/service/type"

interface WebinarDetailCardProps {
  webinar: Webinar | null
  badge: ReactNode
  fallbackTitle?: string
}

export function WebinarDetailCard({ webinar, badge, fallbackTitle = "Webinar Session" }: WebinarDetailCardProps) {
  const thumbnail = webinar?.media?.find(
    (m) => m.file_type === "image" && m.field_type === "thumbnail"
  )

  return (
    <div className="order-last md:order-first rounded-2xl overflow-hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-xl border border-white/60 dark:border-slate-700">
      {thumbnail?.file_url && (
        <div className="relative w-full">
          <Image
            src={thumbnail.file_url}
            alt="Webinar thumbnail"
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-auto"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}
      <div className="p-6">
        {badge}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight mb-3">
          {webinar?.title ?? fallbackTitle}
        </h1>
        {webinar?.description && (
          <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">
            {webinar.description}
          </p>
        )}

        {webinar?.presenters?.length && webinar.presenters.length > 0 && (
          <>
            <hr className="border-gray-100 dark:border-slate-700 my-5" />
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-3">
              Your {webinar.presenters.length === 1 ? "Presenter" : "Presenters"}
            </p>
            <div className="flex flex-col gap-3">
              {webinar.presenters.map((presenter) => {
                const avatar = presenter.media?.find(
                  (m) =>
                    m.file_type === "image" &&
                    (m.field_type === "thumbnail" ||
                      m.field_type === "icon" ||
                      m.field_type === "profile")
                )
                return (
                  <div key={presenter.id} className="flex items-center gap-3">
                    <div className="relative h-11 w-11 rounded-full overflow-hidden bg-emerald-100 dark:bg-emerald-900/40 flex-shrink-0 ring-2 ring-white dark:ring-slate-600 shadow">
                      {avatar?.file_url ? (
                        <Image
                          src={avatar.file_url}
                          alt={presenter.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-emerald-700 font-bold text-sm">
                          {presenter.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {presenter.name}
                    </p>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
