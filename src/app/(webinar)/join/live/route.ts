import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { resolveJoin } from '@/attendee-session/service/resolve-join'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { getWebinar } from '@/webinar/service'
import { isWebinarPayload } from '@/webinar/service/guards'
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
    const rawJoinToken = searchParams.get('t')
    const webinarId = searchParams.get('webinar_id')

    if (!rawJoinToken || !webinarId) {
        const url = createRedirectUrl('/')
        return NextResponse.redirect(url)
    }

    const data = await resolveJoin(rawJoinToken).catch(() => null)
    if (!data) {
        const url = createRedirectUrl(`/${webinarId}/register`)
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
    const webinar = await getWebinar(webinarId, { fresh: false })
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
}
