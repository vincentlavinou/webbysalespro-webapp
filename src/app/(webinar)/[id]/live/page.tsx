
import { TestBroadcast } from "@broadcast/components/TestBroadcast";
import { createBroadcastServiceToken } from "@/broadcast/service";

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
        <TestBroadcast token={serviceToken} session={sessionId}/>
    </div>
  );
}
