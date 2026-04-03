'use client'

import { useEffect, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer'
import { getPublicWebinarIdFromSessionAction } from '@/webinar/service/action'
import { webinarAppUrl } from '@/webinar/service'

/**
 * Rendered by the live layout when there is no attendee session cookie.
 * Reads window.location.search client-side (layouts can't access searchParams)
 * and forwards accordingly:
 *   t + webinar_id  → /join/live  (resolve token and enter room)
 *   webinar_id only → {webinarAppUrl}/{webinarId}/register
 *   neither         → resolve webinarId from sessionId, then go to register
 */
export function JoinTokenRedirect({ sessionId }: { sessionId: string }) {
    const hasStartedRef = useRef(false)
    const { execute } = useAction(getPublicWebinarIdFromSessionAction, {
        onSuccess: ({ data }) => {
            const webinarId = data?.webinar_id
            if (webinarId) {
                window.location.replace(`${webinarAppUrl}/${webinarId}/register`)
                return
            }

            window.location.replace(`${webinarAppUrl}/webinars`)
        },
        onError: () => {
            window.location.replace(`${webinarAppUrl}/webinars`)
        },
    })

    useEffect(() => {
        if (hasStartedRef.current) return
        hasStartedRef.current = true

        const params = new URLSearchParams(window.location.search)
        const t = params.get('t')
        const webinarId = params.get('webinar_id')

        if (t && webinarId) {
            window.location.replace(
                `${webinarAppUrl}/join/live?t=${encodeURIComponent(t)}&webinar_id=${encodeURIComponent(webinarId)}`
            )
        } else if (webinarId) {
            window.location.replace(`${webinarAppUrl}/${webinarId}/register`)
        } else {
            execute({ session_id: sessionId })
        }
    }, [execute, sessionId])

    return <WaitingRoomShimmer title="Redirecting…" />
}
