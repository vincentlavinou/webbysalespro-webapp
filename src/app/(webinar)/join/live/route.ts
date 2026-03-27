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
        const url = request.nextUrl.clone()
        url.pathname = '/'
        url.search = ''
        return NextResponse.redirect(url)
    }

    let data: JoinResolveResponse
    try {
        const response = await fetch(
            `${webinarApiUrl}/v2/join/resolve?t=${encodeURIComponent(rawJoinToken)}`,
            { cache: 'no-store' }
        )
        if (!response.ok) {
            const url = request.nextUrl.clone()
            url.pathname = `/${webinarId}/register`
            url.search = ''
            return NextResponse.redirect(url)
        }
        data = await response.json() as JoinResolveResponse
    } catch {
        const url = request.nextUrl.clone()
        url.pathname = `/${webinarId}/register`
        url.search = ''
        return NextResponse.redirect(url)
    }

    const { effective_session, auth, attendance } = data
    const sessionId = effective_session.id
    const status = effective_session.status as WebinarSessionStatus
    const joinUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`

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

    if (status === WebinarSessionStatus.CANCELED) {
        const url = request.nextUrl.clone()
        url.pathname = `/${webinarId}/register`
        url.search = ''
        return NextResponse.redirect(url)
    }

    if (status === WebinarSessionStatus.COMPLETED) {
        const url = request.nextUrl.clone()
        url.pathname = `/${sessionId}/completed`
        url.search = ''
        return NextResponse.redirect(url)
    }

    if (status === WebinarSessionStatus.IN_PROGRESS) {
        const url = request.nextUrl.clone()
        url.pathname = `/${sessionId}/live`
        url.search = ''
        return NextResponse.redirect(url)
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
        const url = request.nextUrl.clone()
        url.pathname = `/${sessionId}/early-access-room`
        url.search = ''
        return NextResponse.redirect(url)
    }

    const url = request.nextUrl.clone()
    url.pathname = `/${sessionId}/waiting-room`
    url.search = ''
    return NextResponse.redirect(url)
}
