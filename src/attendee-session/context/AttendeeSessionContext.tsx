'use client'

import { createContext } from 'react'

export type AttendeeSessionContextType = {
    joinSessionToken: string
    expiresAt: string
    attendanceId: string
    sessionId: string
    webinarId: string
    /** Call after a 401/403 to rotate the token immediately */
    refresh: () => Promise<void>
}

export const AttendeeSessionContext = createContext<AttendeeSessionContextType | null>(null)
