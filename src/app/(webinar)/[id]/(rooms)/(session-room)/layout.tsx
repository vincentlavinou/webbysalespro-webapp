import Image from "next/image"
import { WebinarFooter } from "@/webinar/components"
import { WebinarProvider } from "@/webinar/providers"
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie"

interface SessionRoomLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function SessionRoomLayout({ children, params }: SessionRoomLayoutProps) {
  const { id: routeSessionId } = await params
  const cookie = await getAttendeeSessionCookie()
  const sessionId = cookie?.sessionId || routeSessionId

  return (
    <WebinarProvider sessionId={sessionId}>
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
          {children}
        </main>

        <WebinarFooter />
      </div>
    </WebinarProvider>
  )
}
