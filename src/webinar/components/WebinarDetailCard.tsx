import Image from "next/image"
import { ReactNode, type CSSProperties } from "react"
import { Webinar } from "@/webinar/service/type"
import { sanitizeRichText } from "@/lib/sanitize-rich-text"
import { Card, CardContent } from "@/components/ui/card"
import { buildContrastTokens } from "@/webinar/theme/contrast"

interface WebinarDetailCardProps {
  webinar: Webinar | null
  badge?: ReactNode
  fallbackTitle?: string
  primaryColor?: string
  backgroundColor?: string
  secondaryBackgroundColor?: string
}

export function WebinarDetailCard({
  webinar,
  badge,
  fallbackTitle = "Webinar Session",
  primaryColor,
  backgroundColor,
  secondaryBackgroundColor,
}: WebinarDetailCardProps) {
  const thumbnail = webinar?.media?.find(
    (m) => m.file_type === "image" && m.field_type === "thumbnail"
  )
  const sanitizedDescription = webinar?.description ? sanitizeRichText(webinar.description) : ""
  const cardBackground = secondaryBackgroundColor ?? backgroundColor
  const contrast = cardBackground ? buildContrastTokens(cardBackground) : null

  return (
    <Card
      className={`order-last overflow-hidden py-0 shadow-xl backdrop-blur-md md:order-first ${cardBackground ? "" : "bg-card/90"}`}
      style={cardBackground ? { backgroundColor: cardBackground } : undefined}
    >
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
      <CardContent className="p-6">
        {badge}
        <h1
          className="mb-1 text-2xl font-bold leading-tight text-foreground md:text-3xl"
          style={contrast ? { color: contrast.foreground } : undefined}
        >
          {webinar?.title ?? fallbackTitle}
        </h1>
        {webinar?.sub_title && (
          <p
            className="mb-3 text-center text-base font-medium text-primary"
            style={primaryColor ? { color: primaryColor } : undefined}
          >
            {webinar.sub_title}
          </p>
        )}
        {webinar?.description && (
          <div
            className="prose prose-sm max-w-none leading-relaxed text-muted-foreground dark:prose-invert"
            style={
              contrast
                ? ({
                    "--tw-prose-body": contrast.mutedForeground,
                    "--tw-prose-headings": contrast.foreground,
                    "--tw-prose-bold": contrast.foreground,
                    "--tw-prose-bullets": contrast.mutedForeground,
                  } as CSSProperties)
                : undefined
            }
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
      </CardContent>
    </Card>
  )
}
