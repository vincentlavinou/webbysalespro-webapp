'use client'

import { useWebinar } from "@/webinar/hooks";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { DateTime } from 'luxon';
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer';
import { LocalStreamEventType } from "@/broadcast/service/enum";
import { AttendeePlayerClient } from "@/broadcast/AttendeePlayerClient";
import { useEffect } from "react";
import { BroadcastParticipantClient } from "@/broadcast/BroadcastParticipantClient";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { useRouter } from "next/navigation";

interface Props {
    searchParams: Promise<{
        token: string
    }>
}

export default function BroadcastPage({ searchParams }: Props) {

    const router = useRouter();
    const { sessionId, broadcastServiceToken, token, session, webinar, setSession, regenerateBroadcastToken } = useWebinar()

    useEffect(() => {
        const init = async () => {
            const token = (await searchParams).token
            await regenerateBroadcastToken(token)
        }

        init()
    }, [])

    useEffect(() => {
        if (!session || !webinar || !token) return;

        const waitingRoomOpensAt = DateTime.fromISO(session.scheduled_start, { zone: session.timezone })
            .minus({ minutes: webinar.settings.waiting_room_start_time });

        if (session.status === WebinarSessionStatus.SCHEDULED &&
            waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()) {
            router.replace(`/${sessionId}/early-access-room?token=${token}`);
            return;
        }

        if (session.status === WebinarSessionStatus.SCHEDULED) {
            router.replace(`/${sessionId}/waiting-room?token=${token}`);
            return;
        }
    }, [session, webinar, token, sessionId, router]);

    if (!broadcastServiceToken || !session || !webinar || !token) {
        return <WaitingRoomShimmer />;
    }


    if (broadcastServiceToken.role === 'presenter' && broadcastServiceToken.stream) {
        return <BroadcastParticipantClient
            sessionId={sessionId}
            accessToken={token}
            broadcastToken={broadcastServiceToken}
            title={webinar.title}
            isViewer
        />
    }

    if (broadcastServiceToken.role === "attendee" && broadcastServiceToken.stream) {
        return <AttendeePlayerClient
            sessionId={sessionId}
            accessToken={token}
            broadcastToken={broadcastServiceToken as AttendeeBroadcastServiceToken}
            title={webinar.title}
            onStreamEvent={(event) => {
                if (event.type === LocalStreamEventType.OFFER_EVENT) {
                    setSession({ ...session, offer_visible: event.payload["visible"] as boolean })
                }
            }}
        />
    }

    return <WaitingRoomShimmer />;


}
