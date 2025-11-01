'use client'

import { useWebinar } from "@/webinar/hooks";
import { redirect } from "next/navigation";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { DateTime } from 'luxon';
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer';
import { LocalStreamEventType } from "@/broadcast/service/enum";
import { AttendeePlayerClient } from "@/broadcast/AttendeePlayerClient";

export default function BroadcastPage() {

    const { sessionId, broadcastServiceToken, token, session, webinar, setSession } = useWebinar()
    if (!broadcastServiceToken || !session || !webinar || !token) {
        return <WaitingRoomShimmer />;
    }

    if (session?.status === WebinarSessionStatus.SCHEDULED &&
        DateTime.fromISO(session.scheduled_start, { zone: session.timezone })
            .minus({ minutes: webinar.settings.waiting_room_start_time })
            .toMillis() > DateTime.now().toMillis()) {
        // waiting room has NOT opened yet
        redirect(`/${sessionId}/early-access-room?token=${token}`)
    }

    if (session?.status === WebinarSessionStatus.SCHEDULED) {
        redirect(`/${sessionId}/waiting-room?token=${token}`)
    }

    return (
        <AttendeePlayerClient
            sessionId={sessionId}
            accessToken={token}
            broadcastToken={broadcastServiceToken}
            title={webinar.title}
            onStreamEvent={(event) => {
                if (event.type === LocalStreamEventType.OFFER_EVENT) {
                    setSession({ ...session, offer_visible: event.payload["visible"] as boolean })
                }
            }}
        />
    )
}
