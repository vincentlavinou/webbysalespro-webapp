'use client'

import { TestBroadcast } from "@broadcast/components/TestBroadcast";
import { useWebinar } from "@/webinar/hooks";
import { redirect } from "next/navigation";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { DateTime } from 'luxon';
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer';
import { BroadcastConfigurationProvider } from "@/broadcast/provider";
import { BroadcastUserProvider } from "@/broadcast/provider/BroadcastUserProvider";

export default function BroadcastPage() {

    const { sessionId, broadcastServiceToken, token, session, webinar } = useWebinar()
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
    
    if(session?.status === WebinarSessionStatus.SCHEDULED) {
        redirect(`/${sessionId}/waiting-room?token=${token}`)
    }

  return (
    <div className="w-full flex items-center justify-center">
        <BroadcastConfigurationProvider sessionId={sessionId} seriesId={broadcastServiceToken.series} accessToken={token}>
            <BroadcastUserProvider userId={broadcastServiceToken.user_id} email={broadcastServiceToken.email}>
                    <TestBroadcast 
                        token={broadcastServiceToken} 
                        session={sessionId}
                        title={webinar.title}
                        />
            </BroadcastUserProvider>
        </BroadcastConfigurationProvider>
    </div>);
 
}
