import type { Viewport } from "next";
import { WebinarProvider } from "@/webinar/providers";
import { AttendeeSessionProvider } from "@/attendee-session/provider/AttendeeSessionProvider";
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie";
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
    return <JoinTokenRedirect />
  }

  return (
    <AttendeeSessionProvider initial={attendeeSession}>
      <WebinarProvider sessionId={attendeeSession.sessionId || routeSessionId} disableSse>
        {children}
      </WebinarProvider>
    </AttendeeSessionProvider>
  )
}
