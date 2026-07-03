'use server'

import { actionClient } from '@/lib/safe-action'
import { clearAttendeeSessionCookie, getAttendeeSessionCookie, setAttendeeSessionCookie } from '@/lib/attendee-cookie'
import { attendeeFetch } from '@/lib/attendee-fetch'
import { handleStatus } from '@/lib/http'
import { retryTransientRequest } from '@/lib/retry'
import { ClaimRegistrantResponse, JoinResolveResponse, JoinSessionRefreshResponse } from './type'
import { claimRegistrantSchema } from './schema'
import { resolveJoin } from './resolve-join'
import { z } from 'zod'

const webinarApiUrl = process.env.WEBINAR_BASE_API_URL
    ?? process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL
    ?? 'https://api.webisalespro.com/api'

const resolveJoinSchema = z.object({
    rawJoinToken: z.string().min(1),
    webinarId: z.string().min(1),
})

export const resolveJoinAction = actionClient
    .inputSchema(resolveJoinSchema)
    .action(async ({ parsedInput }) => {
        const data = await resolveJoin(parsedInput.rawJoinToken)
        if (!data) {
            throw new Error('Join token could not be resolved.')
        }
        return data as JoinResolveResponse
    })

/**
 * Upgrade an anonymous guest join session to a real registrant while they
 * watch. The backend dedups against existing contacts/registrants and keeps
 * the join session valid either way; it also busts the join-session cache so
 * the next chat token comes back send-capable under the real identity.
 * consent_sms stays false because the form collects no explicit SMS opt-in.
 */
export const claimJoinRegistrantAction = actionClient
    .inputSchema(claimRegistrantSchema)
    .action(async ({ parsedInput }) => {
        const response = await attendeeFetch(`${webinarApiUrl}/v2/join/claim/`, {
            method: 'POST',
            body: JSON.stringify({
                first_name: parsedInput.first_name,
                last_name: parsedInput.last_name,
                email: parsedInput.email,
                phone: parsedInput.phone,
                consent_email: true,
                consent_sms: false,
            }),
        })
        const checkedResponse = await handleStatus(response)
        return await checkedResponse.json() as ClaimRegistrantResponse
    })

export const refreshJoinSessionAction = actionClient
    .action(async () => {
        const session = await getAttendeeSessionCookie()
        if (!session) {
            throw new Error('No active session cookie')
        }

        const response = await retryTransientRequest(
            () => fetch(
                `${webinarApiUrl}/v2/join/session/refresh`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.joinSessionToken}`,
                        'Content-Type': 'application/json',
                    },
                    cache: 'no-store',
                }
            ),
            { method: 'POST' },
        )

        if (!response.ok) {
            if (response.status < 500) {
                await clearAttendeeSessionCookie()
            }
            throw new Error(`Refresh failed: ${response.status}`)
        }

        const data = await response.json() as JoinSessionRefreshResponse

        await setAttendeeSessionCookie({
            joinSessionToken: data.join_session_token,
            expiresAt: data.expires_at,
            attendanceId: session.attendanceId,
            sessionId: session.sessionId,
            webinarId: session.webinarId,
            joinUrl: session.joinUrl,
        })

        return data
    })
