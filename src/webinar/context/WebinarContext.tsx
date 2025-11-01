'use client'
import { createContext } from "react"
import { SeriesSession } from "../service"
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type"
import { Webinar } from "../service/type"

export type WebinarContextType = {
    sessionId: string
    broadcastServiceToken?: AttendeeBroadcastServiceToken
    session?: SeriesSession
    webinar?: Webinar
    token?: string
    setSession: (session: SeriesSession) => void
    recordEvent: (name: string, payload?: Record<string, unknown>) => Promise<void>
}

export const WebinarContext = createContext<WebinarContextType>({
    session: undefined,
    sessionId: '',
    broadcastServiceToken: undefined,
    token: undefined,
    setSession: () => {},
    recordEvent: async () => {}
})