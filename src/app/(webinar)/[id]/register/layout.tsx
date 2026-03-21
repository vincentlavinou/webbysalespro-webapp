import { UpcomingSessionBanner } from "@/webinar/components"
import { getWebinar } from "@/webinar/service"
import { isWebinarPayload } from "@/webinar/service/guards"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"


interface RegistrationLayoutProps {
    params: Promise<{
        id: string
    }>
    children: React.ReactNode
}

export default async function RegistrationLayout(props: RegistrationLayoutProps) {

    const webinarId = (await props.params).id
    const webinar = await getWebinar(webinarId, { fresh: true })
    if (!isWebinarPayload(webinar)) {
        notFound()
    }
    const sessions = webinar.series?.sessions || []



    return (
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

            {sessions && sessions?.at(0) && <UpcomingSessionBanner session={sessions?.at(0)}/>}

            <main className="max-w-5xl mx-auto w-full flex-1 mt-20">
                {props.children}
            </main>

            <footer className="mt-16 py-6 text-center text-sm text-muted-foreground">
                <nav className="flex items-center justify-center gap-6">
                    <Link href="/terms" className="hover:underline hover:text-foreground transition-colors">
                        Terms &amp; Conditions
                    </Link>
                    <span aria-hidden>·</span>
                    <Link href="/privacy" className="hover:underline hover:text-foreground transition-colors">
                        Privacy Policy
                    </Link>
                    <span aria-hidden>·</span>
                    <Link href="/dmca" className="hover:underline hover:text-foreground transition-colors">
                        DMCA
                    </Link>
                </nav>
            </footer>
        </div>
    )
}
