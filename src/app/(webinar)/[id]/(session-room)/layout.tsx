import Image from "next/image"
import { WebinarFooter } from "@/webinar/components"
import { WebinarProvider } from "@/webinar/providers"
import { AttendeeSessionProvider } from "@/attendee-session/provider/AttendeeSessionProvider"
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie"
import WaitingRoomShimmer from "@/webinar/components/WaitingRoomShimmer"

interface SessionRoomLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function SessionRoomLayout({ children, params }: SessionRoomLayoutProps) {
  const routeSessionId = (await params).id

  const attendeeSession = await getAttendeeSessionCookie()
  if (!attendeeSession) {
    return (
      <div className="relative min-h-screen flex flex-col">
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

        <main className="flex-1">
          <WaitingRoomShimmer title="Resolving your access..." />
        </main>

        <WebinarFooter />
      </div>
    )
  }

  return (
    <AttendeeSessionProvider initial={attendeeSession}>
      <WebinarProvider sessionId={attendeeSession.sessionId || routeSessionId}>
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
      </WebinarProvider>
    </AttendeeSessionProvider>
  )
}
