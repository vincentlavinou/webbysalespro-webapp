export type JoinResolveResponse = {
    attendance: {
        id: string
    }
    effective_session: {
        id: string
        status: string
        scheduled_start: string
        timezone: string
    }
    session_state: string
    auth: {
        join_session_token: string
        expires_at: string
        capabilities: string[]
    }
}

export type JoinSessionRefreshResponse = {
    join_session_token: string
    expires_at: string
    capabilities: string[]
}

export type ClaimRegistrantResponse = {
    claimed: boolean
    id?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string | null
}

export type AttendeeSessionCookie = {
    joinSessionToken: string
    expiresAt: string
    attendanceId: string
    sessionId: string
    webinarId: string
    joinUrl: string
}
