import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { AttendeeSessionProvider } from '@/attendee-session/provider/AttendeeSessionProvider'
import { getAttendeeSessionCookie } from '@/lib/attendee-cookie'
import { getSessionAction, getWebinarFromSession } from '@/webinar/service/action'
import { isSessionPayload, isWebinarPayload } from '@/webinar/service/guards'
import { WebinarSessionStatus } from '@/webinar/service/enum'
import { resolveRoomSegment } from '@/lib/resolve-room-path'
import { resolveWebinarIdFromSession } from '@/lib/resolve-webinar-id-from-session'

interface RoomsLayoutProps {
    children: React.ReactNode
    params: Promise<{ id: string }>
}

/**
 * Single gatekeeper for all attendee session rooms.
 *
 * Responsibilities:
 *  1. Verify a valid attendee session cookie exists.
 *  2. Fetch fresh session status and resolve the canonical room via
 *     resolveRoomSegment() — the single source of truth for room routing.
 *  3. Redirect to the correct room BEFORE rendering any children.
 *     Redirecting here (in the layout) ensures the response is aborted
 *     before any HTML streams, which prevents the Next.js App Router
 *     "Rendered more hooks than during the previous render" crash that
 *     occurs when redirect() fires mid-stream from a page component.
 *  4. Provide AttendeeSessionProvider to all child rooms.
 *
 * To add a new room: add a page under this route group and add its segment
 * to the RoomSegment type in src/lib/resolve-room-path.ts.
 */
export default async function RoomsLayout({ children, params }: RoomsLayoutProps) {
    const { id: routeSessionId } = await params

    const cookie = await getAttendeeSessionCookie()
    if (!cookie) {
        const headerStore = await headers()
        const joinToken = headerStore.get('x-join-token')
        const webinarId = headerStore.get('x-webinar-id')

        if (joinToken && webinarId) {
            redirect(`/join/live?t=${encodeURIComponent(joinToken)}&webinar_id=${encodeURIComponent(webinarId)}`)
        }
        if (webinarId) {
            redirect(`/${webinarId}/general/join`)
        }

        const resolvedWebinarId = await resolveWebinarIdFromSession(routeSessionId)
        if (resolvedWebinarId) {
            redirect(`/${resolvedWebinarId}/general/join`)
        }

        redirect('/webinar-not-found')
    }

    const sessionId = cookie.sessionId || routeSessionId

    const [sessionResult, webinarResult] = await Promise.all([
        getSessionAction({ id: sessionId }),
        getWebinarFromSession({ id: sessionId }),
    ])

    const session = isSessionPayload(sessionResult.data) ? sessionResult.data : undefined

    if (session?.status === WebinarSessionStatus.CANCELED) {
        redirect(`/${cookie.webinarId}/register`)
    }

    const webinarSettings = isWebinarPayload(webinarResult.data)
        ? webinarResult.data.settings
        : undefined

    const canonicalRoom = resolveRoomSegment(session, webinarSettings)

    if (canonicalRoom) {
        const pathname = (await headers()).get('x-pathname') ?? ''
        const currentRoom = pathname.split('/').at(-1) ?? ''

        if (currentRoom !== canonicalRoom) {
            redirect(`/${sessionId}/${canonicalRoom}`)
        }
    }

    return (
        <AttendeeSessionProvider initial={cookie}>
            {children}
        </AttendeeSessionProvider>
    )
}
