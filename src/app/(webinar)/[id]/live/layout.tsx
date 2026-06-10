import type { Viewport } from "next";
import { redirect } from "next/navigation";
import { WebinarProvider } from "@/webinar/providers";
import { AttendeeSessionProvider } from "@/attendee-session/provider/AttendeeSessionProvider";
import { getAttendeeSessionCookie, hasRecentlyReResolved, isAttendeeSessionStale } from "@/lib/attendee-cookie";
import { JoinTokenRedirect } from "../JoinTokenRedirect";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

interface LiveLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function LiveLayout({ children, params }: LiveLayoutProps) {
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
      <WebinarProvider sessionId={attendeeSession.sessionId || routeSessionId} disableSse>
        {children}
      </WebinarProvider>
    </AttendeeSessionProvider>
  )
}
