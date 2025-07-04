'use client'
import { useState, useEffect } from "react"
import { WebinarContext } from "../context/WebinarContext"
import { SeriesSession, Webinar } from "../service"
import { useSearchParams } from "next/navigation"
import { createBroadcastServiceToken } from "@/broadcast/service"
import { BroadcastServiceToken } from "@/broadcast/service/type"

interface Props {
    sessionId: string
    children: React.ReactNode
}

export const WebinarProvider = ({ children, sessionId }: Props ) => {
    const [session, setSession] = useState<SeriesSession | undefined>(undefined)  
    const [broadcastServiceToken, setBroadcastServiceToken] = useState<BroadcastServiceToken | undefined>(undefined)
    const [token, setToken] = useState<string | undefined>(undefined)
    const [webinar, setWebinar] = useState<Webinar | undefined>(undefined)
    const searchParams = useSearchParams() 

    useEffect(() => {
        const token = searchParams.get('token') || undefined    
        createBroadcastServiceToken(sessionId, token).then((serviceToken) => {
            console.log('serviceToken', serviceToken)
            setSession(serviceToken.session)
            setBroadcastServiceToken(serviceToken)
            setWebinar(serviceToken.webinar)
            setToken(token)
        })
    }, [sessionId])



    return (
        <WebinarContext.Provider value={{ session, setSession, sessionId, broadcastServiceToken, token, webinar }}>
            {children}
        </WebinarContext.Provider>
    )
}