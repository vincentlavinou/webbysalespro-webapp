'use server'

import { actionClient } from '@/lib/safe-action'
import { handleStatus } from '@/lib/http'
import { clearAttendeeSessionCookie, setAttendeeSessionCookie } from '@/lib/attendee-cookie'
import { JoinResolveResponse, JoinSessionRefreshResponse } from './type'
import { z } from 'zod'

const webinarApiUrl = process.env.WEBINAR_BASE_API_URL
    ?? process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL
    ?? 'https://api.webisalespro.com/api'

const resolveJoinSchema = z.object({
    rawJoinToken: z.string().min(1),
    webinarId: z.string().min(1),
})

const refreshJoinSessionSchema = z.object({
    joinSessionToken: z.string().min(1),
    attendanceId: z.string().min(1),
    sessionId: z.string().min(1),
    webinarId: z.string().min(1),
})

export const resolveJoinAction = actionClient
    .inputSchema(resolveJoinSchema)
    .action(async ({ parsedInput }) => {
        const response = await fetch(
            `${webinarApiUrl}/v2/join/resolve?t=${encodeURIComponent(parsedInput.rawJoinToken)}`,
            { cache: 'no-store' }
        )
        const checked = await handleStatus(response)
        return await checked.json() as JoinResolveResponse
    })

export const refreshJoinSessionAction = actionClient
    .inputSchema(refreshJoinSessionSchema)
    .action(async ({ parsedInput }) => {
        const response = await fetch(
            `${webinarApiUrl}/v2/join/session/refresh`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${parsedInput.joinSessionToken}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            }
        )

        if (!response.ok) {
            // Refresh failed — clear the cookie so the layout stops trying
            await clearAttendeeSessionCookie()
            throw new Error(`Refresh failed: ${response.status}`)
        }

        const data = await response.json() as JoinSessionRefreshResponse

        await setAttendeeSessionCookie({
            joinSessionToken: data.join_session_token,
            expiresAt: data.expires_at,
            attendanceId: parsedInput.attendanceId,
            sessionId: parsedInput.sessionId,
            webinarId: parsedInput.webinarId,
        })

        return data
    })
