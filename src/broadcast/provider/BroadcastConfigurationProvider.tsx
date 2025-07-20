'use client'
import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { BroadcastConfigurationContext } from "../context/BroadcastConfigurationContext";

export type BroadcastConfigurationProviderProps = {
    sessionId: string,
    seriesId: string,
    getRequestHeaders?: () => Promise<RequestHeaders | undefined>
    accessToken?: string
    children: React.ReactNode
}

export function BroadcastConfigurationProvider({
    sessionId,
    seriesId,
    getRequestHeaders,
    accessToken,
    children
} : BroadcastConfigurationProviderProps) {

    return <BroadcastConfigurationContext value={{
        sessionId,
        seriesId,
        getRequestHeaders,
        accessToken
    }}>
        {children}
    </BroadcastConfigurationContext>
}