'use server'

import {
    clearAttendeeSessionCookie,
    getAttendeeSessionCookie,
    setAttendeeSessionCookie,
} from './attendee-cookie'

const webinarApiUrl =
    process.env.WEBINAR_BASE_API_URL ??
    process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ??
    'https://api.webisalespro.com/api'

// Refresh if fewer than 5 minutes remain. Accounts for background-tab timer throttling.
const REFRESH_BUFFER_MS = 5 * 60_000

async function serverRefreshToken(): Promise<string | null> {
    const session = await getAttendeeSessionCookie()
    if (!session) return null

    const res = await fetch(`${webinarApiUrl}/v2/join/session/refresh`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${session.joinSessionToken}`,
            'Content-Type': 'application/json',
        },
        cache: 'no-store',
    })

    if (!res.ok) {
        await clearAttendeeSessionCookie()
        return null
    }

    const data = await res.json() as { join_session_token: string; expires_at: string }
    await setAttendeeSessionCookie({
        ...session,
        joinSessionToken: data.join_session_token,
        expiresAt: data.expires_at,
    })

    return data.join_session_token
}

/**
 * Drop-in replacement for `fetch` in server actions that require attendee auth.
 *
 * - Injects the Authorization header automatically.
 * - Proactively refreshes the token if it is near expiry before the request.
 * - On 401 or 403, refreshes the token server-side and retries once.
 *
 * Callers just pipe the response through `handleStatus()` as usual — no per-action
 * retry or refresh logic needed.
 */
export async function attendeeFetch(
    url: string,
    init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
): Promise<Response> {
    const { headers: extra = {}, ...rest } = init

    const session = await getAttendeeSessionCookie()
    let token = session?.joinSessionToken

    // Proactive refresh: if the token is near expiry, refresh before the call
    if (session && new Date(session.expiresAt).getTime() - Date.now() < REFRESH_BUFFER_MS) {
        token = (await serverRefreshToken()) ?? token
    }

    const request = (t: string | undefined) =>
        fetch(url, {
            ...rest,
            headers: {
                'Content-Type': 'application/json',
                ...extra,
                ...(t ? { Authorization: `Bearer ${t}` } : {}),
            },
        })

    const res = await request(token)

    // Reactive refresh: 401 (expired/invalid) or 403 (permission check on join token)
    if (res.status === 401 || res.status === 403) {
        const newToken = await serverRefreshToken()
        if (newToken) return request(newToken)
    }

    return res
}
