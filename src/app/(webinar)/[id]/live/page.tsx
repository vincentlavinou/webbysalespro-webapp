import { WebinarSessionStatus } from "@/webinar/service/enum";
import { DateTime } from 'luxon';
import { AttendeePlayerClient } from "@/broadcast/AttendeePlayerClient";
import { BroadcastParticipantClient } from "@/broadcast/BroadcastParticipantClient";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { notFound, redirect } from "next/navigation";
import { createBroadcastServiceToken } from "@/broadcast/service";
import { getSessionAction, getWebinarFromSession } from "@/webinar/service/action";

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
    const sessionId = (await params).id
    const session = await  getSessionAction({id: sessionId, token})

    if(!session.data) {
        notFound()
    }

    const webinar = await getWebinarFromSession({id: sessionId, token})

    if(!webinar.data) {
        notFound()
    }

    if(session.data.status === WebinarSessionStatus.CANCELED) {
        notFound()
    }

    if(session.data.status === WebinarSessionStatus.COMPLETED) {
        redirect(`/${sessionId}/completed`)
    }

    const waitingRoomOpensAt = DateTime.fromISO(session.data.scheduled_start, { zone: session.data.timezone })
            .minus({ minutes: webinar.data.settings.waiting_room_start_time || 15 });


    if (session.data.status === WebinarSessionStatus.SCHEDULED &&
        waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()) {
        redirect(`/${sessionId}/early-access-room?token=${token}`);
    }

    if (session.data.status === WebinarSessionStatus.SCHEDULED) {
        redirect(`/${sessionId}/waiting-room?token=${token}`);
    }

    const broadcastServiceToken = await createBroadcastServiceToken(sessionId, token);


    if (broadcastServiceToken.role === 'presenter' && broadcastServiceToken.stream) {
        return <BroadcastParticipantClient
            sessionId={sessionId}
            accessToken={token}
            broadcastToken={broadcastServiceToken}
            title={webinar.data.title}
            isViewer
        />
    }

    if (broadcastServiceToken.role === "attendee" && broadcastServiceToken.stream) {
        return <AttendeePlayerClient
            sessionId={sessionId}
            accessToken={token}
            broadcastToken={broadcastServiceToken as AttendeeBroadcastServiceToken}
            title={webinar.data.title}
        />
    }

    if (broadcastServiceToken.role === "host" && broadcastServiceToken.stream) {
        notFound()
    }

    redirect(`/${sessionId}/waiting-room?token=${token}`);
}
