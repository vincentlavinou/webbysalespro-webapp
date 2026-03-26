import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { WebinarProvider } from "@/webinar/providers"
import { AttendeeSessionProvider } from "@/attendee-session/provider/AttendeeSessionProvider"
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie"

interface SessionRoomLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function SessionRoomLayout({ children, params }: SessionRoomLayoutProps) {
  const sessionId = (await params).id

  const attendeeSession = await getAttendeeSessionCookie()
  if (!attendeeSession) {
    // No session — user needs to re-enter via their join link
    redirect(`/`)
  }

  return (
    <AttendeeSessionProvider initial={attendeeSession}>
      <WebinarProvider sessionId={sessionId}>
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

          {/* Footer */}
          <footer className="py-6 text-center text-sm text-gray-500 dark:text-slate-400">
            <div className="flex justify-between max-w-5xl mx-auto">
              <nav className="flex items-start gap-6">
                <Link href="/terms" className="hover:underline hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
                  Terms &amp; Conditions
                </Link>
                <span aria-hidden>·</span>
                <Link href="/privacy" className="hover:underline hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
                  Privacy Policy
                </Link>
                <span aria-hidden>·</span>
                <Link href="/dmca" className="hover:underline hover:text-gray-800 dark:hover:text-slate-200 transition-colors">
                  DMCA
                </Link>
              </nav>
              <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight flex-shrink-0">
                Webby<span className="text-emerald-600 dark:text-emerald-400">Sales</span>Pro
              </span>
            </div>
          </footer>
        </div>
      </WebinarProvider>
    </AttendeeSessionProvider>
  )
}
