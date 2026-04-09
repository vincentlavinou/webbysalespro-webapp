'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AttendeeSessionContext } from '../context/AttendeeSessionContext'
import { AttendeeSessionCookie } from '../service/type'
import { refreshJoinSessionAction } from '../service/action'

// Refresh if fewer than 5 minutes remain on the client-side token.
// Server actions go through attendeeFetch which handles this server-side.
// This only matters for client-side uses: SSE URL and recordEventBeacon.
const REFRESH_BUFFER_MS = 5 * 60_000

interface Props {
    initial: AttendeeSessionCookie
    children: React.ReactNode
}

export function AttendeeSessionProvider({ initial, children }: Props) {
    const [session, setSession] = useState<AttendeeSessionCookie>(initial)
    const sessionRef = useRef<AttendeeSessionCookie>(initial)
    const isRefreshingRef = useRef(false)
    const router = useRouter()

    sessionRef.current = session

    const refresh = useCallback(async (): Promise<string | undefined> => {
        if (isRefreshingRef.current) return undefined
        isRefreshingRef.current = true

        try {
            const result = await refreshJoinSessionAction()

            if (result?.data) {
                const { join_session_token, expires_at } = result.data
                setSession(s => ({
                    ...s,
                    joinSessionToken: join_session_token,
                    expiresAt: expires_at,
                }))
                return join_session_token
            }

            // Refresh failed — session is dead, send to completed
            router.replace(`/${sessionRef.current.sessionId}/completed`)
            return undefined
        } catch {
            router.replace(`/${sessionRef.current.sessionId}/completed`)
            return undefined
        } finally {
            isRefreshingRef.current = false
        }
    }, [router])

    // When the tab becomes visible after being backgrounded, check if the
    // client-side token (used for SSE and beacon) needs refreshing.
    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return
            const current = sessionRef.current
            const isNearExpiry = new Date(current.expiresAt).getTime() - Date.now() < REFRESH_BUFFER_MS
            if (isNearExpiry) void refresh()
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => document.removeEventListener('visibilitychange', onVisible)
    }, [refresh])

    return (
        <AttendeeSessionContext.Provider
            value={{
                joinSessionToken: session.joinSessionToken,
                expiresAt: session.expiresAt,
                attendanceId: session.attendanceId,
                sessionId: session.sessionId,
                webinarId: session.webinarId,
                joinUrl: session.joinUrl,
                refresh,
            }}
        >
            {children}
        </AttendeeSessionContext.Provider>
    )
}
