'use client'

import { TestBroadcast } from "@broadcast/components/TestBroadcast";
import { tokenProvider } from "@/broadcast/service/action";
import { ChatToken } from "amazon-ivs-chat-messaging";
import { useWebinar } from "@/webinar/hooks";
import { redirect } from "next/navigation";
import { WebinarSessionStatus } from "@/webinar/service/enum";

export default function BroadcastPage() {

    const { sessionId, broadcastServiceToken, token, session } = useWebinar()
    if (!broadcastServiceToken || !session) {
        return <div>Loading...</div>
    }
    
    if(session?.status === WebinarSessionStatus.SCHEDULED) {
        redirect(`/${sessionId}/waiting-room?token=${token}`)
    }

  return (
    <div className="w-7xl">
        <TestBroadcast token={broadcastServiceToken} session={sessionId} chatPanel={{
            region: broadcastServiceToken.region,
            provider:  async () => {
                const response = await tokenProvider(sessionId, token)
                return {
                    token: response.chat.token,
                    sessionExpirationTime: response.chat.session_expiration_time,
                    tokenExpirationTime: response.chat.token_expiration_time
                } as ChatToken
            }
        }}/>
    </div>
  );
}
