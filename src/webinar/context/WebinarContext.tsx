'use client'
import { createContext } from "react"
import { SeriesSession } from "../service"
import { BroadcastServiceToken } from "@/broadcast/service/type"
import { Webinar } from "../service/type"

export type WebinarContextType = {
    sessionId: string
    broadcastServiceToken?: BroadcastServiceToken
    session?: SeriesSession
    webinar?: Webinar
    token?: string
    isRedirecting: boolean
    setSession: (session: SeriesSession) => void
    recordEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>
    regenerateBroadcastToken: (token: string) => Promise<void>
}

export const WebinarContext = createContext<WebinarContextType>({
    session: undefined,
    sessionId: '',
    broadcastServiceToken: undefined,
    token: undefined,
    isRedirecting: false,
    setSession: () => {},
    recordEvent: async () => {},
    regenerateBroadcastToken: async () => {}
})