import Image from "next/image"
import { WebinarFooter } from "@/webinar/components"
import { AttendeeSessionProvider } from "@/attendee-session/provider/AttendeeSessionProvider"
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie"
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
