import { CheckCircle } from "lucide-react"
import type { CSSProperties } from "react"
import CalendarButton from "@/webinar/components/CalendarButton"
import BookmarkButton from "@/webinar/components/BookmarkButton"
import ShareButton from "@/webinar/components/ShareButton"
import { SessionDetailCard } from "@/webinar/components/SessionDetailCard"
import { WebinarDetailCard } from "@/webinar/components/WebinarDetailCard"
import { buildContrastTokens } from "@/webinar/theme/contrast"
import type { Webinar } from "@/webinar/service"

export type RegistrationSuccessTheme = {
  primaryColor?: string
  backgroundColor?: string
  secondaryColor?: string
  secondaryBackgroundColor?: string
  buttonTextColor?: string
  fontFamily?: string
}

interface WebinarRegistrationSuccessViewProps {
  webinar: Webinar
  formattedDate: string
  timezone: string
  session: { id: string; scheduled_start: string; timezone: string }
  joinPath?: string
  registrationPath: string
  theme?: RegistrationSuccessTheme
}

export function WebinarRegistrationSuccessView({
  webinar,
  formattedDate,
  timezone,
  session,
  joinPath,
  registrationPath,
  theme,
}: WebinarRegistrationSuccessViewProps) {
  const panelBackground = theme?.secondaryBackgroundColor ?? theme?.backgroundColor
  const contrast = panelBackground ? buildContrastTokens(panelBackground) : null
  const pageContrast = theme?.backgroundColor ? buildContrastTokens(theme.backgroundColor) : null

  const wrapperStyle: CSSProperties | undefined =
    theme?.backgroundColor || theme?.fontFamily || theme?.primaryColor
      ? {
          ...(theme?.primaryColor ? { "--primary": theme.primaryColor } : {}),
          ...(theme?.secondaryColor ? { "--secondary": theme.secondaryColor } : {}),
          ...(theme?.backgroundColor ? { backgroundColor: theme.backgroundColor } : {}),
          ...(theme?.backgroundColor ? { "--background": theme.backgroundColor, "--card": theme.backgroundColor } : {}),
          ...(pageContrast
            ? {
                "--foreground": pageContrast.foreground,
                "--card-foreground": pageContrast.foreground,
                "--border": pageContrast.border,
                "--input": pageContrast.border,
                "--muted-foreground": pageContrast.mutedForeground,
              }
            : {}),
          ...(theme?.secondaryBackgroundColor ? { "--muted": theme.secondaryBackgroundColor } : {}),
          ...(theme?.buttonTextColor ? { "--primary-foreground": theme.buttonTextColor } : {}),
          ...(theme?.fontFamily ? { fontFamily: theme.fontFamily } : {}),
        } as CSSProperties
      : undefined

  return (
    <div className="px-4 pb-8" style={wrapperStyle}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Left — Webinar details */}
        <WebinarDetailCard
          webinar={webinar}
          primaryColor={theme?.primaryColor}
          backgroundColor={theme?.backgroundColor}
          secondaryBackgroundColor={theme?.secondaryBackgroundColor}
        />

        {/* Right — Success confirmation */}
        <div
          className={`order-first md:order-last rounded-2xl backdrop-blur-md shadow-xl border p-6 ${panelBackground ? "" : "bg-white/80 dark:bg-slate-800/80 border-white/60 dark:border-slate-700"}`}
          style={panelBackground ? { backgroundColor: panelBackground, borderColor: contrast?.border } : undefined}
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-700 mb-4">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2
              className="text-2xl font-bold text-gray-900 dark:text-white"
              style={contrast ? { color: contrast.foreground } : undefined}
            >
              You&apos;re Registered!
            </h2>
            <p
              className="text-gray-500 dark:text-slate-400 text-sm mt-1"
              style={contrast ? { color: contrast.mutedForeground } : undefined}
            >
              Check your email for your confirmation and join link.
            </p>
          </div>

          <hr
            className="border-gray-100 dark:border-slate-700 mb-5"
            style={contrast ? { borderColor: contrast.border } : undefined}
          />

          <SessionDetailCard
            formattedDate={formattedDate}
            timezone={timezone}
            clockContent={
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                A reminder will be sent before the session starts.
              </p>
            }
          />

          <hr
            className="border-gray-100 dark:border-slate-700 mt-2"
            style={contrast ? { borderColor: contrast.border } : undefined}
          />

          <div className="flex flex-col gap-2 pt-1">
            {joinPath && (
              <CalendarButton
                title={webinar.title}
                description={webinar.description ?? ''}
                startIso={session.scheduled_start}
                timezone={session.timezone || 'utc'}
                uid={session.id}
                url={joinPath}
              />
            )}
            {joinPath && (
              <BookmarkButton livePath={joinPath} />
            )}
            <ShareButton
              registrationPath={registrationPath}
              title={webinar.title}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
