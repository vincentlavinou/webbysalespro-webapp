
import { TestBroadcast } from "@broadcast/components/TestBroadcast";
import { createBroadcastServiceToken } from "@/broadcast/service";
import { tokenProvider } from "@/broadcast/service/action";
import { ChatToken } from "amazon-ivs-chat-messaging";

interface LiveBroadcastPageProps {
    params: Promise<{
        id: string
    }>
    searchParams: Promise<{
        token: string
    }>
}

export default async function BroadcastPage(props: LiveBroadcastPageProps) {

    const sessionId = (await props.params).id
    const token = (await props.searchParams).token
    const serviceToken = await createBroadcastServiceToken(sessionId, token)

  return (
    <div className="w-7xl">
        <TestBroadcast token={serviceToken} session={sessionId} chatPanel={{
            region: serviceToken.region,
            provider:  async () => {
                'use server'
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
