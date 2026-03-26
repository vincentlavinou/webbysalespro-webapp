import { cookies } from 'next/headers'
import { AttendeeSessionCookie } from '@/attendee-session/service/type'

const COOKIE_NAME = 'attendee_session'
// 30 days — actual access is gated by whether the token can be refreshed
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30

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
