'use client'

import { useEffect, useState } from "react";
import { BroadcastServiceContext } from "../context/BroadcastServiceContext"
import { BroadcastServiceToken } from "../service/type";
import { broadcastApiUrl } from "../service";
import { useSearchParams } from "next/navigation";

interface BroadcastServiceProviderProps {
    session: string
    token: BroadcastServiceToken
    children: React.ReactNode
}

export function BroadcastServiceProvider({ children, token, session }: BroadcastServiceProviderProps) {

    const [mainPresenterId, setMainPresenterId] = useState<string | undefined>(undefined);
    const accessToken = useSearchParams().get('token')

    useEffect(() => {
        const source = new EventSource(`${broadcastApiUrl}/v1/sessions/events/?channels=webinar-session-${session}&token=${accessToken}`);

        source.addEventListener("webinar:session:main_presenter:update", (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            console.log("Main presenter update:", data);
            setMainPresenterId(data.presenter_id);
        });

        source.addEventListener("webinar:session:update", (event: MessageEvent) => {
            const data = JSON.parse(event.data);
            console.log("Session update received:", data);
        });

        source.onerror = () => {
            console.error("EventSource error");
            source.close();
        };

        return () => {
            source.close();
        };
    }, [session, accessToken]);
    
    return <BroadcastServiceContext.Provider value={{
        token: token,
        mainPresenterId
    }}>
        {children}
    </BroadcastServiceContext.Provider>
}