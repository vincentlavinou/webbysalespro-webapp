import { WebinarSessionStatus } from "@/webinar/service/enum";
import { DateTime } from 'luxon';
import { notFound } from "next/navigation";
import { getSessionAction, getWebinarFromSession } from "@/webinar/service/action";
import { LiveContainer } from "@/broadcast/components/LiveContainer";
import { getOfferSessionsForAttendee } from "@/offer-client/service/action";
import { isSessionPayload, isWebinarPayload } from "@/webinar/service/guards";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Props {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        token: string
        ready?: string
    }>
}

export default async function AttendeeLivePage({ params, searchParams }: Props) {

    const resolvedSearch = await searchParams
    const token = resolvedSearch.token
    if (!token) {
        notFound()
    }

    const sessionId = (await params).id

    const [session, webinar] = await Promise.all([
        getSessionAction({ id: sessionId, token }),
        getWebinarFromSession({ id: sessionId, token }),
    ])

    if (!isSessionPayload(session.data)) {
        notFound()
    }

    if (!isWebinarPayload(webinar.data)) {
        notFound()
    }

    if (session.data.status === WebinarSessionStatus.CANCELED) {
        notFound()
    }

    // Determine client-side redirect target (avoids mid-stream server redirect which breaks hydration)
    // When ready=1 the client already confirmed the session is live — skip waiting-room redirect.
    let clientRedirectTo: string | undefined
    if (resolvedSearch.ready !== '1') {
        const waitingRoomOpensAt = DateTime.fromISO(session.data.scheduled_start, { zone: session.data.timezone })
            .minus({ minutes: webinar.data.settings?.waiting_room_start_time || 15 });

        if (session.data.status === WebinarSessionStatus.COMPLETED) {
            clientRedirectTo = `/${sessionId}/completed?token=${token}`
        } else if (session.data.status === WebinarSessionStatus.SCHEDULED &&
            waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()) {
            clientRedirectTo = `/${sessionId}/early-access-room?token=${token}`
        } else if (session.data.status === WebinarSessionStatus.SCHEDULED) {
            clientRedirectTo = `/${sessionId}/waiting-room?token=${token}`
        }
    }

    let offersData: import("@/offer-client/service/type").OfferSessionDto[] = []
    try {
        const offers = await getOfferSessionsForAttendee({ sessionId, token })
        offersData = offers?.data ?? []
    } catch {
        // payment provider unavailable — render live without offers
    }

    return (
    <LiveContainer
      sessionId={sessionId}
      accessToken={token}
      webinarTitle={webinar.data.title}
      offers={offersData}
      clientRedirectTo={clientRedirectTo}
    />
  );
}
