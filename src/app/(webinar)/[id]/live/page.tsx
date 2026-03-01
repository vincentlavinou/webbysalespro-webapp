import { WebinarSessionStatus } from "@/webinar/service/enum";
import { DateTime } from 'luxon';
import { notFound, redirect } from "next/navigation";
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
    }>
}

export default async function AttendeeLivePage({ params, searchParams }: Props) {

    const token = (await searchParams).token
    if (!token) {
        notFound()
    }

    const sessionId = (await params).id
    const session = await  getSessionAction({id: sessionId, token})
    if(!isSessionPayload(session.data)) {
        notFound()
    }

    const webinar = await getWebinarFromSession({id: sessionId, token})

    if(!isWebinarPayload(webinar.data)) {
        notFound()
    }

    if(session.data.status === WebinarSessionStatus.CANCELED) {
        notFound()
    }

    if(session.data.status === WebinarSessionStatus.COMPLETED) {
        redirect(`/${sessionId}/completed`)
    }

    const waitingRoomOpensAt = DateTime.fromISO(session.data.scheduled_start, { zone: session.data.timezone })
            .minus({ minutes: webinar.data.settings?.waiting_room_start_time || 15 });


    if (session.data.status === WebinarSessionStatus.SCHEDULED &&
        waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()) {
        redirect(`/${sessionId}/early-access-room?token=${token}`);
    }

    if (session.data.status === WebinarSessionStatus.SCHEDULED) {
        redirect(`/${sessionId}/waiting-room?token=${token}`);
    }

    const offers = await getOfferSessionsForAttendee({
        sessionId: sessionId,
        token: token
    })

    return (
    <LiveContainer
      sessionId={sessionId}
      accessToken={token}
      webinarTitle={webinar.data.title}
      offers={offers.data || []}
    />
  );
}
