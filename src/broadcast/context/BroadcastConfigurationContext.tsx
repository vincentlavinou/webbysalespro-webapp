'use client'
import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response"
import { createContext } from "react"

export type BroadcastConfigurationContextType = {
    sessionId: string
    seriesId: string
    accessToken?: string
    getRequestHeaders?: () => Promise<RequestHeaders | undefined>
}

export const BroadcastConfigurationContext = createContext<BroadcastConfigurationContextType>({
    sessionId: "",
    seriesId: "",
    getRequestHeaders: undefined,
    accessToken: undefined
})