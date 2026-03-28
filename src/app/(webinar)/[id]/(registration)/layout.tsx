import Image from "next/image"
import { notFound } from "next/navigation"
import { WebinarFooter } from "@/webinar/components"
import { getWebinar } from "@/webinar/service"
import { isWebinarPayload } from "@/webinar/service/guards"

interface RegistrationBranchLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function RegistrationBranchLayout({ children, params }: RegistrationBranchLayoutProps) {
  const webinarId = (await params).id
  const webinar = await getWebinar(webinarId, { fresh: false })
  if (!isWebinarPayload(webinar)) {
    notFound()
  }

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
        {children}
      </main>

      <WebinarFooter />
    </div>
  )
}
