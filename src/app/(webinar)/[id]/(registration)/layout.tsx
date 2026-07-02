import Image from "next/image"
import { notFound } from "next/navigation"
import { PausedWebinarNotice, WebinarFooter } from "@/webinar/components"
import { getPublicWebinarState } from "@/webinar/service"

interface RegistrationBranchLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function RegistrationBranchLayout({ children, params }: RegistrationBranchLayoutProps) {
  const webinarId = (await params).id
  const webinarState = await getPublicWebinarState(webinarId, { fresh: true })
  if (webinarState.kind === "not_found") {
    notFound()
  }

  if (webinarState.kind === "paused") {
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
          <div className="mx-auto w-full max-w-3xl px-4 pb-8 pt-20">
            <PausedWebinarNotice pauseInfo={webinarState.pauseInfo} />
          </div>
        </main>

        <WebinarFooter />
      </div>
    )
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
