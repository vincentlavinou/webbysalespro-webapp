import { cookies } from 'next/headers'
import { AttendeeSessionCookie } from '@/attendee-session/service/type'

const COOKIE_NAME = 'attendee_session'
// 30 days — actual access is gated by whether the token can be refreshed
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

// Treat the session token as stale when within this window of expiry.
const STALE_BUFFER_MS = 5 * 60_000

// Set briefly by /join/live after a successful re-resolve. The room layouts skip
// their stale-redirect while it is present, so a token that comes back still near
// expiry (short backend TTL / clock skew) can't bounce us into an endless
// layout → /join/live → layout redirect loop. Expires on its own; one resolve =
// at most one suppressed redirect, after which normal behavior resumes.
export const RERESOLVE_MARKER_COOKIE = '_attendee_reresolved'
export const RERESOLVE_MARKER_MAX_AGE_SECONDS = 30

/**
 * True when the session token is expired or close enough to expiry that we
 * should re-resolve before relying on it. Used on page load to bounce the
 * attendee back through /join/live for a fresh token.
 */
export function isAttendeeSessionStale(session: AttendeeSessionCookie): boolean {
    return new Date(session.expiresAt).getTime() - Date.now() < STALE_BUFFER_MS
}

/**
 * True when /join/live just minted a fresh cookie. Layouts use this as a loop
 * guard: don't re-resolve again immediately after a resolve round-trip.
 */
export async function hasRecentlyReResolved(): Promise<boolean> {
    const store = await cookies()
    return store.get(RERESOLVE_MARKER_COOKIE)?.value === '1'
}

export async function getAttendeeSessionCookie(): Promise<AttendeeSessionCookie | null> {
    const store = await cookies()
    const raw = store.get(COOKIE_NAME)?.value
    if (!raw) return null
    try {
        return JSON.parse(raw) as AttendeeSessionCookie
    } catch {
        return null
    }
}

export async function setAttendeeSessionCookie(session: AttendeeSessionCookie): Promise<void> {
    const store = await cookies()
    store.set(COOKIE_NAME, JSON.stringify(session), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: MAX_AGE_SECONDS,
    })
}

export async function clearAttendeeSessionCookie(): Promise<void> {
    const store = await cookies()
    store.delete(COOKIE_NAME)
}
