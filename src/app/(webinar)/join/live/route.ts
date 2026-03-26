import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { JoinResolveResponse } from '@/attendee-session/service/type'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { getWebinar } from '@/webinar/service'
import { isWebinarPayload } from '@/webinar/service/guards'
import { DateTime } from 'luxon'

const webinarApiUrl = process.env.WEBINAR_BASE_API_URL
    ?? process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL
    ?? 'https://api.webisalespro.com/api'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const rawJoinToken = searchParams.get('t')
    const webinarId = searchParams.get('webinar_id')

    if (!rawJoinToken || !webinarId) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    let data: JoinResolveResponse
    try {
        const response = await fetch(
            `${webinarApiUrl}/v2/join/resolve?t=${encodeURIComponent(rawJoinToken)}`,
            { cache: 'no-store' }
        )
        if (!response.ok) {
            return NextResponse.redirect(new URL(`/${webinarId}/register`, request.url))
        }
        data = await response.json() as JoinResolveResponse
    } catch {
        return NextResponse.redirect(new URL(`/${webinarId}/register`, request.url))
    }

    const { effective_session, auth, attendance } = data
    const sessionId = effective_session.id
    const status = effective_session.status as WebinarSessionStatus

    // Set the persistent httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('attendee_session', JSON.stringify({
        joinSessionToken: auth.join_session_token,
        expiresAt: auth.expires_at,
        attendanceId: attendance.id,
        sessionId,
        webinarId,
    }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
    })

    if (status === WebinarSessionStatus.CANCELED) {
        return NextResponse.redirect(new URL(`/${webinarId}/register`, request.url))
    }

    if (status === WebinarSessionStatus.COMPLETED) {
        return NextResponse.redirect(new URL(`/${sessionId}/completed`, request.url))
    }

    if (status === WebinarSessionStatus.IN_PROGRESS) {
        return NextResponse.redirect(new URL(`/${sessionId}/live`, request.url))
    }

    // SCHEDULED — decide between early-access-room and waiting-room
    const webinar = await getWebinar(webinarId, { fresh: false })
    const waitingRoomMinutes = isWebinarPayload(webinar)
        ? (webinar.settings?.waiting_room_start_time ?? 15)
        : 15

    const waitingRoomOpensAt = DateTime.fromISO(effective_session.scheduled_start, {
        zone: effective_session.timezone,
    }).minus({ minutes: waitingRoomMinutes })

    if (waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()) {
        return NextResponse.redirect(new URL(`/${sessionId}/early-access-room`, request.url))
    }

    return NextResponse.redirect(new URL(`/${sessionId}/waiting-room`, request.url))
}
