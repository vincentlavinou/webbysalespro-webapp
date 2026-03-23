import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getWebinar } from "@/webinar/service"
import { isWebinarPayload } from "@/webinar/service/guards"
import { WebinarProvider } from "@/webinar/providers"

interface AttendeeLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function AttendeeLayout({ children, params }: AttendeeLayoutProps) {
  const webinarId = (await params).id
  const webinar = await getWebinar(webinarId, { fresh: false })
  if (!isWebinarPayload(webinar)) {
    notFound()
  }

  return (
    <WebinarProvider sessionId={webinarId}>
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
        </div>

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="py-6 text-center text-sm text-gray-500">
          <div className="flex justify-between  max-w-5xl mx-auto">
            <nav className="flex items-start gap-6">
              <Link href="/terms" className="hover:underline hover:text-gray-800 transition-colors">
                Terms &amp; Conditions
              </Link>
              <span aria-hidden>·</span>
              <Link href="/privacy" className="hover:underline hover:text-gray-800 transition-colors">
                Privacy Policy
              </Link>
              <span aria-hidden>·</span>
              <Link href="/dmca" className="hover:underline hover:text-gray-800 transition-colors">
                DMCA
              </Link>
            </nav>
            <span className="text-sm font-bold text-gray-900 tracking-tight flex-shrink-0">
              Webby<span className="text-emerald-600">Sales</span>Pro
            </span>
          </div>
        </footer>
      </div>
    </WebinarProvider>
  )
}
