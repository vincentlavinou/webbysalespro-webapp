'use server'

import { cache } from 'react'
import { getAttendeeSessionCookie } from './attendee-cookie'

// Deduplicated within a single server render pass
const getCachedAttendeeSession = cache(async () => {
    return await getAttendeeSessionCookie()
})

export async function getAttendeeAuthHeader(): Promise<HeadersInit | undefined> {
    const session = await getCachedAttendeeSession()
    if (!session?.joinSessionToken) return undefined
    return { 'Authorization': `Bearer ${session.joinSessionToken}` }
}
