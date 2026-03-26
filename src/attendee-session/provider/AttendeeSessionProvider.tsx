'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AttendeeSessionContext } from '../context/AttendeeSessionContext'
import { AttendeeSessionCookie } from '../service/type'
import { refreshJoinSessionAction } from '../service/action'

// Refresh this many ms before the token expires.
// 5 minutes accounts for browser background-tab timer throttling
// (Chrome throttles to ≥1 min intervals, Safari more aggressively).
const REFRESH_BUFFER_MS = 5 * 60_000

interface Props {
    initial: AttendeeSessionCookie
    children: React.ReactNode
}

export function AttendeeSessionProvider({ initial, children }: Props) {
    const [session, setSession] = useState<AttendeeSessionCookie>(initial)
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isRefreshingRef = useRef(false)
    const sessionRef = useRef<AttendeeSessionCookie>(initial)
    const doRefreshRef = useRef<(() => Promise<string | undefined>) | null>(null)
    const router = useRouter()

    // Keep sessionRef in sync without stale closures
    sessionRef.current = session

    const scheduleRefresh = useCallback((expiresAt: string) => {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)

        const msUntilRefresh = new Date(expiresAt).getTime() - Date.now() - REFRESH_BUFFER_MS
        const delay = Math.max(msUntilRefresh, 0)

        refreshTimerRef.current = setTimeout(() => {
            doRefreshRef.current?.()
        }, delay)
    }, [])

    const doRefresh = useCallback(async (): Promise<string | undefined> => {
        if (isRefreshingRef.current) return undefined
        isRefreshingRef.current = true
        const current = sessionRef.current

        try {
            const result = await refreshJoinSessionAction()

            if (result?.data) {
                const updated: AttendeeSessionCookie = {
                    ...current,
                    joinSessionToken: result.data.join_session_token,
                    expiresAt: result.data.expires_at,
                }
                setSession(updated)
                scheduleRefresh(updated.expiresAt)
                return updated.joinSessionToken
            } else {
                // Refresh failed (action cleared the cookie server-side) — go to completed
                router.replace(`/${current.sessionId}/completed`)
                return undefined
            }
        } catch {
            router.replace(`/${current.sessionId}/completed`)
            return undefined
        } finally {
            isRefreshingRef.current = false
        }
    }, [router, scheduleRefresh])

    // Keep doRefreshRef in sync
    useEffect(() => {
        doRefreshRef.current = doRefresh
    }, [doRefresh])

    // On mount: if already expired/near-expiry, refresh immediately; otherwise schedule
    useEffect(() => {
        const isExpired = new Date(session.expiresAt).getTime() - Date.now() < REFRESH_BUFFER_MS
        if (isExpired) {
            doRefresh()
        } else {
            scheduleRefresh(session.expiresAt)
        }

        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
        }
        // Run once on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // When the tab becomes visible, immediately check if the token needs refresh.
    // This handles browser background-tab suspension where the timer never fired.
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return
            const current = sessionRef.current
            const isExpiredOrNear = new Date(current.expiresAt).getTime() - Date.now() < REFRESH_BUFFER_MS
            if (isExpiredOrNear) {
                doRefreshRef.current?.()
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])

    const refresh = useCallback(async (): Promise<string | undefined> => {
        return await doRefresh()
    }, [doRefresh])

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
