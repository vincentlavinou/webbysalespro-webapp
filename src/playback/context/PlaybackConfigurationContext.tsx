'use client'
import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response"
import { createContext } from "react"

export type PlaybackConfigurationContextType = {
    sessionId: string
    seriesId: string
    getRequestHeaders?: () => Promise<RequestHeaders | undefined>
}

export const PlaybackConfigurationContext = createContext<PlaybackConfigurationContextType>({
    sessionId: "",
    seriesId: "",
    getRequestHeaders: undefined,
})
