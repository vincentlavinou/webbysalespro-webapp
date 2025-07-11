'use client'
import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response"
import { createContext } from "react"

export type BroadcastConfigurationContextType = {
    sessionId: string
    seriesId: string
    accessToken?: string
    requestHeaders?: RequestHeaders
}

export const BroadcastConfigurationContext = createContext<BroadcastConfigurationContextType>({
    sessionId: "",
    seriesId: "",
    requestHeaders: undefined,
    accessToken: undefined
})