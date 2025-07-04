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
    setSession: (session: SeriesSession) => void
}

export const WebinarContext = createContext<WebinarContextType>({
    session: undefined,
    sessionId: '',
    broadcastServiceToken: undefined,
    token: undefined,
    setSession: () => {}
})