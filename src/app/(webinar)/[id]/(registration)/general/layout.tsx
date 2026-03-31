import { UpcomingSessionBanner } from "@/webinar/components/UpcomingSessionBanner"
import { getWebinar } from "@/webinar/service"
import { isWebinarPayload } from "@/webinar/service/guards"
import { notFound } from "next/navigation"

interface RegistrationLayoutProps {
    params: Promise<{
        id: string
    }>
    children: React.ReactNode
}

export default async function GeneralLinkLayout(props: RegistrationLayoutProps) {
    const webinarId = (await props.params).id
    const webinar = await getWebinar(webinarId, { fresh: true })
    if (!isWebinarPayload(webinar)) {
        notFound()
    }
    const sessions = webinar.series?.sessions || []

    return (
        <>
            {sessions?.at(0) && <UpcomingSessionBanner session={sessions.at(0)} />}
            <div className="max-w-5xl mx-auto w-full pt-20 pb-4">
                {props.children}
            </div>
        </>
    )
}
