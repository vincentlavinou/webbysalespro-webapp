'use server'

import { retryTransientRequest } from '@lavinou/webbysalespro/networking'

import { captureApiErrorResponse } from '@/lib/error'
import { guestCredentials } from '@/lib/guest-credentials'

/**
 * Drop-in replacement for `fetch` in server actions that require guest auth.
 *
 * - Injects the Authorization header, refreshing the token first if it is near
 *   expiry.
 * - On 401 or 403, recovers the session server-side and retries once.
 *
 * Returns the `Response` rather than throwing, because callers pipe it through
 * `handleStatus()` which owns this app's status semantics — 404 + `WEB-PAUSED`
 * becoming a paused-webinar error the registration UI branches on, and so forth.
 * Keeping that split is why this is a thin wrapper and not `createGuestApi`.
 *
 * The session lifecycle it depends on — refresh, coalescing, JR-008/JR-009
 * re-resolve — lives in `@lavinou/webbysalespro/networking/guest` and is shared
 * with any other surface holding a join session.
 */
export async function attendeeFetch(
    url: string,
    init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
): Promise<Response> {
    const { headers: extra = {}, ...rest } = init
    const credentials = guestCredentials()
    const context = { url, method: rest.method?.toUpperCase() }

    const attempt = async () => {
        const auth = await credentials.headers(context)

        return retryTransientRequest(
            () =>
                fetch(url, {
                    ...rest,
                    headers: {
                        'Content-Type': 'application/json',
                        ...extra,
                        ...auth,
                    },
                }),
            { method: rest.method }
        )
    }

    let response = await attempt()

    // One shot only. `recover` refreshes, or re-resolves the join link when the
    // refresh is rejected as unrecoverable, and reports whether replaying is
    // worth it.
    if (response.status === 401 || response.status === 403) {
        const outcome = await credentials.recover?.(response, context)
        if (outcome === 'retry') response = await attempt()
    }

    if (!response.ok) {
        await captureApiErrorResponse(response, { operation: 'attendee-api-request' })
    }

    return response
}
