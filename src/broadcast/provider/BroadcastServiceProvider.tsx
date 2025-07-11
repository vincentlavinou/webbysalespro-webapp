'use client'

import { useEffect, useState } from "react";
import { BroadcastServiceContext } from "../context/BroadcastServiceContext"
import { BroadcastServiceToken } from "../service/type";
import { useBroadcastConfiguration } from "../hooks";
import { broadcastApiUrl } from "../service";

interface BroadcastServiceProviderProps {
    session: string
    token: BroadcastServiceToken
    children: React.ReactNode
}

export function BroadcastServiceProvider({ children, token, session }: BroadcastServiceProviderProps) {

    const [mainPresenterId] = useState<string | undefined>(undefined);
    const {requestHeaders, accessToken} = useBroadcastConfiguration()

    useEffect(() => {
        const params = new URLSearchParams();
        params.append("channels", `webinar-session-${session}`);
        if(requestHeaders) {
            const authorization = (requestHeaders as {
                Authorization: string;
            }).Authorization
            params.append("jwt", authorization.replace("Bearer ", "").trim());
        } else if(accessToken) {
            params.append("token", accessToken)
        }
        const source = new EventSource(`${broadcastApiUrl}/v1/sessions/events/?${params.toString()}`);

        source.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log(data)
            if (data.event === "webinar:session:update") {
                console.log(data.data)
            }
        };

        source.onerror = () => {
            source.close();
        };

        return () => {
        source.close();
        };
    }, [session, requestHeaders]);
    
    return <BroadcastServiceContext.Provider value={{
        token: token,
        mainPresenterId
    }}>
        {children}
    </BroadcastServiceContext.Provider>
}