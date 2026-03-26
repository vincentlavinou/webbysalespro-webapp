'use client'

import { createContext } from 'react'

export type AttendeeSessionContextType = {
    joinSessionToken: string
    expiresAt: string
    attendanceId: string
    sessionId: string
    webinarId: string
    joinUrl: string
    /** Call after a 401/403 to rotate the token immediately. Returns the new token, or undefined if refresh failed. */
    refresh: () => Promise<string | undefined>
}

export const AttendeeSessionContext = createContext<AttendeeSessionContextType | null>(null)
