import { UpcomingSessionBanner } from "@/webinar/components"
import { getWebinar } from "@/webinar/service"


interface RegistrationLayoutProps {
    params: Promise<{
        id: string
    }>
    children: React.ReactNode
}

export default async function RegistrationLayout(props: RegistrationLayoutProps) {

    const webinarId = (await props.params).id
    const webinar = await getWebinar(webinarId)
    const sessions = webinar.series?.flatMap((series) => series.sessions)



    return  <div className="max-w-xl mx-auto mt-10">
        {props.children}
        {sessions && sessions?.at(0) && <UpcomingSessionBanner session={sessions?.at(0)}/>}
    </div>
}