import Image from "next/image"
import { ReactNode } from "react"
import { Webinar } from "@/webinar/service/type"
import { sanitizeRichText } from "@/lib/sanitize-rich-text"

interface WebinarDetailCardProps {
  webinar: Webinar | null
  badge: ReactNode
  fallbackTitle?: string
}

export function WebinarDetailCard({ webinar, badge, fallbackTitle = "Webinar Session" }: WebinarDetailCardProps) {
  const thumbnail = webinar?.media?.find(
    (m) => m.file_type === "image" && m.field_type === "thumbnail"
  )
  const sanitizedDescription = webinar?.description ? sanitizeRichText(webinar.description) : ""

  return (
    <div className="order-last overflow-hidden rounded-2xl border border-border bg-card/90 shadow-xl backdrop-blur-md md:order-first">
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
        <h1 className="mb-1 text-2xl font-bold leading-tight text-foreground md:text-3xl">
          {webinar?.title ?? fallbackTitle}
        </h1>
        {webinar?.sub_title && (
          <p className="mb-3 text-center text-base font-medium text-primary">
            {webinar.sub_title}
          </p>
        )}
        {webinar?.description && (
          <div
            className="prose prose-sm max-w-none leading-relaxed text-muted-foreground dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        )}

        {webinar?.presenters?.length && webinar.presenters.length > 0 && (
          <>
            <hr className="my-5 border-border" />
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                    <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full bg-primary/10 shadow ring-2 ring-background">
                      {avatar?.file_url ? (
                        <Image
                          src={avatar.file_url}
                          alt={presenter.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
                          {presenter.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-foreground">
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
