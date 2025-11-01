"use client";

import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { BroadcastConfigurationProvider } from "./provider";
import { BroadcastUserProvider } from "./provider/BroadcastUserProvider";
import { AttendeeBroadcastServiceToken, LocalStreamEvent } from "./service/type";
import { AttendeePlayerLayout } from "./components/AttendeePlayerLayout";

interface AttendeePlayerClientProps {
    sessionId: string,
    getRequestHeaders?: () => Promise<RequestHeaders | undefined>
    accessToken?: string
    broadcastToken: AttendeeBroadcastServiceToken
    onStreamEvent?: (event: LocalStreamEvent) => void
    title?: string,
}

export function AttendeePlayerClient(props: AttendeePlayerClientProps) {

    return (
        <BroadcastConfigurationProvider sessionId={props.sessionId} getRequestHeaders={props.getRequestHeaders} seriesId={props.broadcastToken.series} accessToken={props.accessToken}>
            <BroadcastUserProvider userId={props.broadcastToken.user_id} email={props.broadcastToken.email}>
                    <AttendeePlayerLayout broadcast={props.broadcastToken} title={props.title} />
            </BroadcastUserProvider>
        </BroadcastConfigurationProvider >
    )
}