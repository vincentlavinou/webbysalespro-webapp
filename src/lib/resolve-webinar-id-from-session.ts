import { webinarApiUrl } from '@/webinar/service'

/**
 * Resolves a webinar ID from a session ID using the public endpoint.
 * No auth token required.
 * Returns null if the session is not found or the request fails.
 */
export async function resolveWebinarIdFromSession(sessionId: string): Promise<string | null> {
    try {
        const response = await fetch(
            `${webinarApiUrl}/v1/sessions/${sessionId}/webinar/id/`,
            { cache: 'no-store' }
        )
        if (!response.ok) return null
        const data = await response.json() as { session_id: string; webinar_id: string }
        return data.webinar_id ?? null
    } catch {
        return null
    }
}
