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

export default async function RegistrationLayout(props: RegistrationLayoutProps) {
    const webinarId = (await props.params).id
    const webinar = await getWebinar(webinarId)
    if (!isWebinarPayload(webinar)) {
        notFound()
    }
    const sessions = webinar.series?.sessions || []
    const theme = webinar.registration_settings?.theme

    return (
        <>
            {sessions?.at(0) && (
                <UpcomingSessionBanner
                    session={sessions.at(0)}
                    primaryColor={theme?.primary_color ?? undefined}
                    secondaryColor={theme?.secondary_color ?? undefined}
                    buttonTextColor={theme?.button_text_color ?? undefined}
                />
            )}
            <div className="max-w-5xl mx-auto w-full pt-20 pb-4">
                {props.children}
            </div>
        </>
    )
}
