import { WebinarSessionStatus } from "@/webinar/service/enum";
import { redirect } from "next/navigation";
import { getSessionAction, getWebinarFromSession } from "@/webinar/service/action";
import { LiveContainer } from "@/broadcast/components/LiveContainer";
import { getOfferSessionsForAttendee } from "@/offer-client/service/action";
import { isSessionPayload, isWebinarPayload } from "@/webinar/service/guards";
import { getAttendeeSessionCookie } from "@/lib/attendee-cookie";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
    params: Promise<{
        id: string
    }>
}

export default async function AttendeeLivePage({ params }: Props) {
    const routeSessionId = (await params).id

    const attendeeSession = await getAttendeeSessionCookie()
    if (!attendeeSession) {
        redirect('/')
    }

    const sessionId = attendeeSession.sessionId
    if (routeSessionId !== sessionId) {
        redirect(`/${sessionId}/live`)
    }

    const [session, webinar] = await Promise.all([
        getSessionAction({ id: sessionId }),
        getWebinarFromSession({ id: sessionId }),
    ])

    if (!isSessionPayload(session.data) || !isWebinarPayload(webinar.data) || session.data.status === WebinarSessionStatus.CANCELED) {
        redirect(`/${attendeeSession.webinarId}/register`)
    }

    let offersData: import("@/offer-client/service/type").OfferSessionDto[] = []
    try {
        const offers = await getOfferSessionsForAttendee({ sessionId })
        offersData = offers?.data ?? []
    } catch {
        // payment provider unavailable — render live without offers
    }

    return (
        <LiveContainer
            sessionId={sessionId}
            webinarTitle={webinar.data.title}
            offers={offersData}
        />
    )
}
