'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer'
import { webinarAppUrl } from '@/webinar/service'

/**
 * Rendered by the live layout when there is no attendee session cookie.
 * Reads window.location.search client-side (layouts can't access searchParams)
 * and forwards accordingly:
 *   t + webinar_id  → /join/live  (resolve token and enter room)
 *   webinar_id only → {webinarAppUrl}/{webinarId}/register
 *   neither         → /
 */
export function JoinTokenRedirect() {
    const router = useRouter()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const t = params.get('t')
        const webinarId = params.get('webinar_id')

        if (t && webinarId) {
            router.replace(
                `/join/live?t=${encodeURIComponent(t)}&webinar_id=${encodeURIComponent(webinarId)}`
            )
        } else if (webinarId) {
            window.location.replace(`${webinarAppUrl}/${webinarId}/register`)
        } else {
            router.replace('/')
        }
    }, [router])

    return <WaitingRoomShimmer title="Redirecting…" />
}
