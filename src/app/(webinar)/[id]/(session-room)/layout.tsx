import Image from "next/image"
import { redirect } from "next/navigation"
import { WebinarFooter } from "@/webinar/components"
import { AttendeeSessionProvider } from "@/attendee-session/provider/AttendeeSessionProvider"
import { getAttendeeSessionCookie, hasRecentlyReResolved, isAttendeeSessionStale } from "@/lib/attendee-cookie"
import { JoinTokenRedirect } from "../JoinTokenRedirect"

interface SessionRoomLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function SessionRoomLayout({ children, params }: SessionRoomLayoutProps) {
  const routeSessionId = (await params).id

  const attendeeSession = await getAttendeeSessionCookie()
  if (!attendeeSession) {
    return <JoinTokenRedirect sessionId={routeSessionId} />
  }

  // On (re)load with a stale token, bounce through /join/live so the backend
  // re-resolves the join link and mints a fresh attendee cookie before render.
  // Skip if we just re-resolved, so a still-stale token can't cause a loop.
  if (
    attendeeSession.joinUrl &&
    isAttendeeSessionStale(attendeeSession) &&
    !(await hasRecentlyReResolved())
  ) {
    redirect(attendeeSession.joinUrl)
  }

  return (
    <AttendeeSessionProvider initial={attendeeSession}>
      <div className="relative min-h-screen flex flex-col">
        {/* Background */}
        <div className="fixed inset-0 -z-10">
          <Image
            src="/example-background.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-transparent dark:bg-slate-900/70" />
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>

        <WebinarFooter />
      </div>
    </AttendeeSessionProvider>
  )
}
