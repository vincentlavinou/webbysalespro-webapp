import Image from "next/image"
import { notFound } from "next/navigation"
import { WebinarFooter } from "@/webinar/components"
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

        <WebinarFooter />
      </div>
    </WebinarProvider>
  )
}
