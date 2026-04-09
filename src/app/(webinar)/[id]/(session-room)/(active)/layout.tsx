import { WebinarProvider } from "@/webinar/providers"
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie"

interface ActiveSessionLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function ActiveSessionLayout({ children, params }: ActiveSessionLayoutProps) {
  const routeSessionId = (await params).id
  const attendeeSession = await getAttendeeSessionCookie()

  return (
    <WebinarProvider sessionId={attendeeSession?.sessionId || routeSessionId}>
      {children}
    </WebinarProvider>
  )
}
