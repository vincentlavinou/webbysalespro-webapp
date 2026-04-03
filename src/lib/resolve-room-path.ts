import { DateTime } from 'luxon'
import { WebinarSessionStatus } from '@/webinar/service/enum'

/**
 * The URL segment for each attendee room.
 * Add new rooms here — the (rooms)/layout.tsx gatekeeper uses this type
 * to enforce that every session lands on the correct room.
 */
export type RoomSegment =
    | 'live'
    | 'waiting-room'
    | 'early-access-room'
    | 'completed'

interface SessionLike {
    status: string
    scheduled_start: string
    timezone: string
}

interface WebinarSettingsLike {
    waiting_room_start_time?: number
}

/**
 * Given a session and webinar settings, returns the room segment the attendee
 * should currently be in, or null if the session is in an unroutable state
 * (e.g. CANCELED — caller should redirect to register).
 */
export function resolveRoomSegment(
    session: SessionLike | undefined,
    webinarSettings: WebinarSettingsLike | null | undefined,
): RoomSegment | null {
    if (!session) return null

    const status = session.status as WebinarSessionStatus

    if (status === WebinarSessionStatus.IN_PROGRESS) return 'live'
    if (status === WebinarSessionStatus.COMPLETED) return 'completed'
    if (status !== WebinarSessionStatus.SCHEDULED) return null // CANCELED or unknown

    const waitingRoomMinutes = webinarSettings?.waiting_room_start_time ?? 15
    const waitingRoomOpensAt = DateTime.fromISO(session.scheduled_start, {
        zone: session.timezone,
    }).minus({ minutes: waitingRoomMinutes })

    return waitingRoomOpensAt.toMillis() > DateTime.now().toMillis()
        ? 'early-access-room'
        : 'waiting-room'
}
