import type { Viewport } from "next";
import { WebinarProvider } from "@/webinar/providers";
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie";

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
  const { id: routeSessionId } = await params
  const cookie = await getAttendeeSessionCookie()
  const sessionId = cookie?.sessionId || routeSessionId

  return (
    <WebinarProvider sessionId={sessionId} disableSse>
      {children}
    </WebinarProvider>
  )
}
