import { UpcomingSessionBanner } from "@/webinar/components"
import { getWebinar } from "@/webinar/service"
import { isWebinarPayload } from "@/webinar/service/guards"
import { notFound } from "next/navigation"


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



    return <>
    {sessions && sessions?.at(0) && <UpcomingSessionBanner session={sessions?.at(0)}/>}
    <main className="max-w-xl mx-auto min-h-screen mt-20">
        {props.children}
    </main>
    </> 
}
