import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { cookies } from 'next/headers'
import { resolveJoin } from '@/attendee-session/service/resolve-join'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { getWebinar } from '@/webinar/service'
import { isWebinarPayload } from '@/webinar/service/guards'
import { sanitizeJoinToken, sanitizeWebinarId } from '@/webinar/service/join-params'
import { RERESOLVE_MARKER_COOKIE, RERESOLVE_MARKER_MAX_AGE_SECONDS } from '@/lib/attendee-cookie'
import { DateTime } from 'luxon'

const webinarAppUrl = (
    process.env.WEBINAR_APP_URL
    ?? process.env.NEXT_PUBLIC_WEBINAR_APP_URL
    ?? process.env.APP_URL
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? 'https://events.webisalespro.com'
).replace(/\/+$/, '')

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function createRedirectUrl(pathname: string) {
    return new URL(pathname, webinarAppUrl)
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const joinToken = sanitizeJoinToken(searchParams.get('t'))
    const webinarId = sanitizeWebinarId(searchParams.get('webinar_id'))

    if (!joinToken || !webinarId) {
        const url = createRedirectUrl('/')
        return NextResponse.redirect(url)
    }

    try {
        const data = await resolveJoin(joinToken).catch(() => null)
        if (!data) {
            const url = createRedirectUrl(`/${webinarId}/general/join`)
            return NextResponse.redirect(url)
        }

        const { effective_session, auth, attendance } = data
        const sessionId = effective_session.id
        const status = effective_session.status as WebinarSessionStatus
        const joinSearch = new URLSearchParams({
            t: joinToken,
            webinar_id: webinarId,
        })
        const joinUrl = `${request.nextUrl.pathname}?${joinSearch.toString()}`

        // Set the persistent httpOnly cookie
        const cookieStore = await cookies()
        cookieStore.set('attendee_session', JSON.stringify({
            joinSessionToken: auth.join_session_token,
            expiresAt: auth.expires_at,
            attendanceId: attendance.id,
            sessionId,
            webinarId,
            joinUrl,
        }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        })

        // One-shot marker so the room layouts don't immediately re-resolve again
        // on the return trip — bounds the stale-redirect to a single attempt.
        cookieStore.set(RERESOLVE_MARKER_COOKIE, '1', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: RERESOLVE_MARKER_MAX_AGE_SECONDS,
        })

        if (status === WebinarSessionStatus.CANCELED) {
            const url = createRedirectUrl(`/${webinarId}/register`)
            return NextResponse.redirect(url)
        }

        if (status === WebinarSessionStatus.COMPLETED) {
            const url = createRedirectUrl(`/${sessionId}/completed`)
            return NextResponse.redirect(url)
        }

        if (status === WebinarSessionStatus.IN_PROGRESS) {
            const url = createRedirectUrl(`/${sessionId}/live`)
            return NextResponse.redirect(url)
        }

        // SCHEDULED — decide between early-access-room and waiting-room
        const webinar = await getWebinar(webinarId, { fresh: false }).catch(() => null)
        const waitingRoomMinutes = isWebinarPayload(webinar)
            ? (webinar.settings?.waiting_room_start_time ?? 15)
            : 15

        const waitingRoomOpensAt = DateTime.fromISO(effective_session.scheduled_start, {
            zone: effective_session.timezone,
        }).minus({ minutes: waitingRoomMinutes })

        if (waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()) {
            const url = createRedirectUrl(`/${sessionId}/early-access-room`)
            return NextResponse.redirect(url)
        }

        const url = createRedirectUrl(`/${sessionId}/waiting-room`)
        return NextResponse.redirect(url)
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                route: 'join/live',
            },
            extra: {
                webinarId,
            },
        })
        const url = createRedirectUrl(`/${webinarId}/general/join`)
        return NextResponse.redirect(url)
    }
}
