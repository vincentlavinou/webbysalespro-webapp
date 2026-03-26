'use client'

import { useContext } from 'react'
import { AttendeeSessionContext, AttendeeSessionContextType } from '../context/AttendeeSessionContext'

export function useAttendeeSession(): AttendeeSessionContextType {
    const ctx = useContext(AttendeeSessionContext)
    if (!ctx) {
        throw new Error('useAttendeeSession must be used inside AttendeeSessionProvider')
    }
    return ctx
}
