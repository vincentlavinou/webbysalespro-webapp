'use client'
import { useState, useEffect, useCallback } from "react"
import { WebinarContext } from "../context/WebinarContext"
import { SeriesSession, SessionOfferVisibilityUpdate, Webinar, webinarApiUrl } from "../service"
import { useRouter, useSearchParams } from "next/navigation"
import { createBroadcastServiceToken, recordEvent } from "@/broadcast/service"
import { BroadcastServiceToken } from "@/broadcast/service/type"
import { WebinarSessionStatus } from "../service/enum"

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
    const router = useRouter()

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

     useEffect(() => {
    
        if (!token || !broadcastServiceToken) return
    
        const source = new EventSource(
          `${webinarApiUrl}/v1/sessions/events/?channels=webinar-session-${broadcastServiceToken.session?.id || sessionId}&token=${token}`
        )
    
        source.addEventListener('webinar:session:update', (event: MessageEvent) => {
            const data = JSON.parse(event.data) as { status: WebinarSessionStatus }
            setSession(prev => ({...prev, status: data.status} as SeriesSession))
            switch(data.status) {
                case WebinarSessionStatus.IN_PROGRESS:
                    router.replace(`/${sessionId}/live?token=${token}`)
                    break;
                case WebinarSessionStatus.COMPLETED:
                    router.replace(`/${sessionId}/completed?token=${token}`)
                    source.close()
                    break;
            }
            
        })

        source.addEventListener('webinar:offer:visibility', (event: MessageEvent) => {
            const data = JSON.parse(event.data) as SessionOfferVisibilityUpdate
            setSession(prev => ({...prev, offer_visible: data.visible, offer_shown_at: data.shown_at} as SeriesSession))
        })
    
        source.onerror = (error) => {
          console.error('EventSource error:', error)
          source.close()
        }
    
        return () => {
          source.close()
        }
      }, [sessionId, token, router, setSession])


    const recordSessionEvent = useCallback(async (name: string, payload: Record<string, unknown> | undefined) => {
        if(!token) return
        try {
            await recordEvent(name, sessionId, token, payload)
        } catch(e) {
            console.log(e)
        }
        
    },[sessionId, token])


    return (
        <WebinarContext.Provider value={{ 
            session, 
            setSession, 
            sessionId, 
            broadcastServiceToken, 
            token, 
            webinar,
            recordEvent: recordSessionEvent 
            }}>
            {children}
        </WebinarContext.Provider>
    )
}