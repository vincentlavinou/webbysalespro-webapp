'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AttendeeSessionContext } from '../context/AttendeeSessionContext'
import { AttendeeSessionCookie } from '../service/type'
import { refreshJoinSessionAction } from '../service/action'

// Refresh this many ms before the token actually expires
const REFRESH_BUFFER_MS = 60_000

interface Props {
    initial: AttendeeSessionCookie
    children: React.ReactNode
}

export function AttendeeSessionProvider({ initial, children }: Props) {
    const [session, setSession] = useState<AttendeeSessionCookie>(initial)
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isRefreshingRef = useRef(false)
    const router = useRouter()

    const scheduleRefresh = useCallback((expiresAt: string) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

        const msUntilRefresh = new Date(expiresAt).getTime() - Date.now() - REFRESH_BUFFER_MS
        const delay = Math.max(msUntilRefresh, 0)

        refreshTimerRef.current = setTimeout(async () => {
            await doRefresh(session)
        }, delay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session])

    const doRefresh = useCallback(async (current: AttendeeSessionCookie) => {
        if (isRefreshingRef.current) return
        isRefreshingRef.current = true

        try {
            const result = await refreshJoinSessionAction({
                joinSessionToken: current.joinSessionToken,
                attendanceId: current.attendanceId,
                sessionId: current.sessionId,
                webinarId: current.webinarId,
            })

            if (result?.data) {
                const updated: AttendeeSessionCookie = {
                    ...current,
                    joinSessionToken: result.data.join_session_token,
                    expiresAt: result.data.expires_at,
                }
                setSession(updated)
                scheduleRefresh(updated.expiresAt)
            } else {
                // Refresh failed (action cleared the cookie server-side) — go to completed
                router.replace(`/${current.sessionId}/completed`)
            }
        } catch {
            router.replace(`/${current.sessionId}/completed`)
        } finally {
            isRefreshingRef.current = false
        }
    }, [router, scheduleRefresh])

    // On mount: if already expired, refresh immediately; otherwise schedule
    useEffect(() => {
        const isExpired = new Date(session.expiresAt).getTime() - Date.now() < REFRESH_BUFFER_MS
        if (isExpired) {
            doRefresh(session)
        } else {
            scheduleRefresh(session.expiresAt)
        }

        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        }
    // Run once on mount with the initial session
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const refresh = useCallback(async () => {
        await doRefresh(session)
    }, [doRefresh, session])

    return (
        <AttendeeSessionContext.Provider
            value={{
                joinSessionToken: session.joinSessionToken,
                expiresAt: session.expiresAt,
                attendanceId: session.attendanceId,
                sessionId: session.sessionId,
                webinarId: session.webinarId,
                refresh,
            }}
        >
            {children}
        </AttendeeSessionContext.Provider>
    )
}
