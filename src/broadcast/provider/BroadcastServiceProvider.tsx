'use client'

import { useEffect, useState } from "react";
import { BroadcastServiceContext } from "../context/BroadcastServiceContext"
import { BroadcastServiceToken } from "../service/type";

interface BroadcastServiceProviderProps {
    session: string
    token: BroadcastServiceToken
    children: React.ReactNode
}

export function BroadcastServiceProvider({ children, token, session }: BroadcastServiceProviderProps) {

    const [mainPresenterId, setMainPresenterId] = useState<string | undefined>(undefined);

    useEffect(() => {
        const source = new EventSource(`/events/?channels=webinar-session-${session}/`);

        source.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === "webinar:session:main_presenter:update") {
            setMainPresenterId(data.presenter_id);
        }
        };

        source.onerror = () => {
        source.close();
        };

        return () => {
        source.close();
        };
    }, [session]);
    
    return <BroadcastServiceContext.Provider value={{
        token: token,
        mainPresenterId
    }}>
        {children}
    </BroadcastServiceContext.Provider>
}