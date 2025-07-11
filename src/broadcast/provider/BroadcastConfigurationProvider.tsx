'use client'
import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { BroadcastConfigurationContext } from "../context/BroadcastConfigurationContext";

export type BroadcastConfigurationProviderProps = {
    sessionId: string,
    seriesId: string,
    requestHeaders?: RequestHeaders
    accessToken?: string
    children: React.ReactNode
}

export function BroadcastConfigurationProvider({
    sessionId,
    seriesId,
    requestHeaders,
    accessToken,
    children
} : BroadcastConfigurationProviderProps) {

    return <BroadcastConfigurationContext value={{
        sessionId,
        seriesId,
        requestHeaders,
        accessToken
    }}>
        {children}
    </BroadcastConfigurationContext>
}