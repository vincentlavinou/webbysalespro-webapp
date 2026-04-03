'use client'

import { useEffect } from 'react'
import WaitingRoomShimmer from '@/webinar/components/WaitingRoomShimmer'
import { webinarAppUrl } from '@/webinar/service'

export function HardRedirect({ to }: { to: string }) {
    useEffect(() => {
        window.location.replace(`${webinarAppUrl}${to}`)
    }, [to])

    return <WaitingRoomShimmer title="Redirecting…" />
}
