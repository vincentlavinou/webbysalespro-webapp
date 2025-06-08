
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

    const webinarId = (await props.params).id
    const token = (await props.searchParams).token
    const serviceToken = await createBroadcastServiceToken(webinarId, token)

  return (
    <div>
        <TestBroadcast accessToken={serviceToken.service_access_token}/>
    </div>
  );
}
