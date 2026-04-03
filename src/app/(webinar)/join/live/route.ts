import { NextRequest, NextResponse } from 'next/server'
import { JoinResolveResponse } from '@/attendee-session/service/type'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { getWebinar, webinarAppUrl } from '@/webinar/service'
import { isWebinarPayload } from '@/webinar/service/guards'
import { SeriesSession } from '@/webinar/service'
import { DateTime } from 'luxon'

const webinarApiUrl = process.env.WEBINAR_BASE_API_URL
    ?? process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL
    ?? 'https://api.webisalespro.com/api'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
const SESSION_COOKIE = 'attendee_session'
const JOIN_REDIRECT_COOKIE = '_join_redirect'

function createRedirectUrl(request: NextRequest, pathname: string) {
    const url = new URL(pathname, webinarAppUrl.replace(/\/+$/, ''))
    url.search = ''
    return url
}

function createRedirectResponse(url: URL, attendeeSession?: {
    joinSessionToken: string
    expiresAt: string
    attendanceId: string
    sessionId: string
    webinarId: string
    joinUrl: string
}) {
    const response = NextResponse.redirect(url)

    if (attendeeSession) {
        response.cookies.set(SESSION_COOKIE, JSON.stringify(attendeeSession), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        })
    }

    response.cookies.delete(JOIN_REDIRECT_COOKIE)
    return response
}

async function getHydratedSession(sessionId: string, joinSessionToken: string) {
    const response = await fetch(`${webinarApiUrl}/v1/sessions/${sessionId}/attendee-hydrate/`, {
        headers: {
            Authorization: `Bearer ${joinSessionToken}`,
        },
        cache: 'no-store',
    })

    if (!response.ok) {
        throw new Error('Unable to hydrate attendee session')
    }

    return await response.json() as SeriesSession
}

export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const rawJoinToken = searchParams.get('t')
    const webinarId = searchParams.get('webinar_id')
    const requestedPath = request.nextUrl.pathname
    const requestedRoomSessionId = requestedPath.split('/').filter(Boolean)[0] ?? null

    if (!rawJoinToken || !webinarId) {
        const url = webinarId
            ? createRedirectUrl(request, `/${webinarId}/general/join`)
            : createRedirectUrl(request, '/webinar-not-found')
        console.info('[join/live] missing join params', {
            requestedPath,
            requestedRoomSessionId,
            webinarId,
            hasToken: Boolean(rawJoinToken),
            redirectTo: url.toString(),
        })
        return NextResponse.redirect(url)
    }

    let data: JoinResolveResponse
    try {
        const response = await fetch(
            `${webinarApiUrl}/v2/join/resolve?t=${encodeURIComponent(rawJoinToken)}`,
            { cache: 'no-store' }
        )
        if (!response.ok) {
            const url = createRedirectUrl(request, `/${webinarId}/general/join`)
            console.info('[join/live] resolve failed', {
                requestedPath,
                requestedRoomSessionId,
                webinarId,
                status: response.status,
                redirectTo: url.toString(),
            })
            return NextResponse.redirect(url)
        }
        data = await response.json() as JoinResolveResponse
    } catch {
        const url = createRedirectUrl(request, `/${webinarId}/general/join`)
        console.info('[join/live] resolve threw', {
            requestedPath,
            requestedRoomSessionId,
            webinarId,
            redirectTo: url.toString(),
        })
        return NextResponse.redirect(url)
    }

    const { effective_session, auth, attendance } = data
    const sessionId = effective_session.id
    const joinUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`

    const attendeeSession = {
        joinSessionToken: auth.join_session_token,
        expiresAt: auth.expires_at,
        attendanceId: attendance.id,
        sessionId,
        webinarId,
        joinUrl,
    }

    let hydratedSession: SeriesSession
    try {
        hydratedSession = await getHydratedSession(sessionId, auth.join_session_token)
    } catch {
        const url = createRedirectUrl(request, `/${webinarId}/general/join`)
        console.info('[join/live] hydrate failed', {
            requestedPath,
            requestedRoomSessionId,
            webinarId,
            resolvedSessionId: effective_session.id,
            resolvedStatus: effective_session.status,
            redirectTo: url.toString(),
        })
        return NextResponse.redirect(url)
    }

    const status = hydratedSession.status as WebinarSessionStatus

    console.info('[join/live] token resolved', {
        requestedPath,
        requestedRoomSessionId,
        webinarId,
        resolvedSessionId: effective_session.id,
        resolvedStatus: effective_session.status,
        hydratedSessionId: hydratedSession.id,
        hydratedStatus: hydratedSession.status,
        attendanceId: attendance.id,
    })

    if (status === WebinarSessionStatus.CANCELED) {
        const url = createRedirectUrl(request, `/${webinarId}/register`)
        console.info('[join/live] redirect canceled', {
            requestedPath,
            requestedRoomSessionId,
            webinarId,
            hydratedSessionId: hydratedSession.id,
            redirectTo: url.toString(),
        })
        return createRedirectResponse(url, attendeeSession)
    }

    if (status === WebinarSessionStatus.COMPLETED) {
        const url = createRedirectUrl(request, `/${sessionId}/completed`)
        console.info('[join/live] redirect completed', {
            requestedPath,
            requestedRoomSessionId,
            webinarId,
            hydratedSessionId: hydratedSession.id,
            redirectTo: url.toString(),
        })
        return createRedirectResponse(url, attendeeSession)
    }

    if (status === WebinarSessionStatus.IN_PROGRESS) {
        const url = createRedirectUrl(request, `/${sessionId}/live`)
        console.info('[join/live] redirect live', {
            requestedPath,
            requestedRoomSessionId,
            webinarId,
            hydratedSessionId: hydratedSession.id,
            redirectTo: url.toString(),
        })
        return createRedirectResponse(url, attendeeSession)
    }

    // SCHEDULED — decide between early-access-room and waiting-room
    const webinar = await getWebinar(webinarId, { fresh: false })
    const waitingRoomMinutes = isWebinarPayload(webinar)
        ? (webinar.settings?.waiting_room_start_time ?? 15)
        : 15

    const waitingRoomOpensAt = DateTime.fromISO(hydratedSession.scheduled_start, {
        zone: hydratedSession.timezone,
    }).minus({ minutes: waitingRoomMinutes })

    if (waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()) {
        const url = createRedirectUrl(request, `/${sessionId}/early-access-room`)
        console.info('[join/live] redirect early-access-room', {
            requestedPath,
            requestedRoomSessionId,
            webinarId,
            hydratedSessionId: hydratedSession.id,
            waitingRoomMinutes,
            redirectTo: url.toString(),
        })
        return createRedirectResponse(url, attendeeSession)
    }

    const url = createRedirectUrl(request, `/${sessionId}/waiting-room`)
    console.info('[join/live] redirect waiting-room', {
        requestedPath,
        requestedRoomSessionId,
        webinarId,
        hydratedSessionId: hydratedSession.id,
        waitingRoomMinutes,
        redirectTo: url.toString(),
    })
    return createRedirectResponse(url, attendeeSession)
}
