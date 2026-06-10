'use server'

import {
    clearAttendeeSessionCookie,
    getAttendeeSessionCookie,
    setAttendeeSessionCookie,
} from './attendee-cookie'
import { retryTransientRequest } from './retry'
import { resolveJoin } from '@/attendee-session/service/resolve-join'

const webinarApiUrl =
    process.env.WEBINAR_BASE_API_URL ??
    process.env.NEXT_PUBLIC_WEBINAR_BASE_API_URL ??
    'https://api.webisalespro.com/api'

// Refresh if fewer than 5 minutes remain. Accounts for background-tab timer throttling.
const REFRESH_BUFFER_MS = 5 * 60_000

// Hard ceiling on a single refresh request so it can't hang indefinitely.
const REFRESH_FETCH_TIMEOUT_MS = 10_000

// In-flight refreshes keyed by the token being refreshed. The backend invalidates
// the old token the instant a refresh succeeds, so two concurrent refreshes
// replaying the same token would race — the loser sends an already-dead token and
// gets the session cleared. Keying by token (not a global flag) coalesces only
// calls refreshing the *same* token, so concurrent users never share a result.
const inflightRefreshes = new Map<string, Promise<string | null>>()

async function performRefresh(
    session: NonNullable<Awaited<ReturnType<typeof getAttendeeSessionCookie>>>
): Promise<string | null> {
    const res = await retryTransientRequest(
        () =>
            fetch(`${webinarApiUrl}/v2/join/session/refresh`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.joinSessionToken}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
                // Guarantees the promise settles even if the upstream stalls, so the
                // in-flight map entry is always released. AbortError is non-retryable.
                signal: AbortSignal.timeout(REFRESH_FETCH_TIMEOUT_MS),
            }),
        { method: 'POST' }
    )

    if (!res.ok) {
        await clearAttendeeSessionCookie()
        return null
    }

    const data = await res.json() as { join_session_token: string; expires_at: string }
    await setAttendeeSessionCookie({
        ...session,
        joinSessionToken: data.join_session_token,
        expiresAt: data.expires_at,
    })

    return data.join_session_token
}

async function serverRefreshToken(): Promise<string | null> {
    const session = await getAttendeeSessionCookie()
    if (!session) return null

    const key = session.joinSessionToken
    const existing = inflightRefreshes.get(key)
    if (existing) return existing

    const promise = performRefresh(session).finally(() => {
        inflightRefreshes.delete(key)
    })
    inflightRefreshes.set(key, promise)
    return promise
}

// Error codes that mean the join session can't be refreshed — the underlying
// join link must be re-resolved to mint a brand new session token.
const RE_RESOLVE_CODES = ['JR-008', 'JR-009']

function isReResolveCode(bodyText: string): boolean {
    return RE_RESOLVE_CODES.some((code) => bodyText.includes(code))
}

function extractRawJoinToken(joinUrl: string): string | null {
    const query = joinUrl.split('?')[1]
    if (!query) return null
    return new URLSearchParams(query).get('t')
}

/**
 * Re-resolve the stored join link into a fresh session token. Used when a
 * refresh is rejected with JR-008/JR-009 — the session token is unrecoverable
 * but the original join link may still mint a new one.
 */
async function serverReResolve(): Promise<string | null> {
    const session = await getAttendeeSessionCookie()
    if (!session?.joinUrl) return null

    const rawToken = extractRawJoinToken(session.joinUrl)
    if (!rawToken) return null

    const data = await resolveJoin(rawToken).catch(() => null)
    if (!data) {
        await clearAttendeeSessionCookie()
        return null
    }

    await setAttendeeSessionCookie({
        ...session,
        joinSessionToken: data.auth.join_session_token,
        expiresAt: data.auth.expires_at,
        attendanceId: data.attendance.id,
        sessionId: data.effective_session.id,
    })

    return data.auth.join_session_token
}

/**
 * Drop-in replacement for `fetch` in server actions that require attendee auth.
 *
 * - Injects the Authorization header automatically.
 * - Proactively refreshes the token if it is near expiry before the request.
 * - On 401 or 403, refreshes the token server-side and retries once.
 *
 * Callers just pipe the response through `handleStatus()` as usual — no per-action
 * retry or refresh logic needed.
 */
export async function attendeeFetch(
    url: string,
    init: Omit<RequestInit, 'headers'> & { headers?: Record<string, string> } = {}
): Promise<Response> {
    const { headers: extra = {}, ...rest } = init

    const session = await getAttendeeSessionCookie()
    let token = session?.joinSessionToken

    // Proactive refresh: if the token is near expiry, refresh before the call
    if (session && new Date(session.expiresAt).getTime() - Date.now() < REFRESH_BUFFER_MS) {
        token = (await serverRefreshToken()) ?? token
    }

    const request = (t: string | undefined) =>
        retryTransientRequest(
            () =>
                fetch(url, {
                    ...rest,
                    headers: {
                        'Content-Type': 'application/json',
                        ...extra,
                        ...(t ? { Authorization: `Bearer ${t}` } : {}),
                    },
                }),
            { method: rest.method }
        )

    const res = await request(token)

    // Reactive recovery: 401 (expired/invalid) or 403 (permission check on join token)
    if (res.status === 401 || res.status === 403) {
        // JR-008/JR-009 mean the session token is unrecoverable — re-resolve the
        // join link instead of refreshing. Read a clone so the caller still gets
        // an intact body if recovery ultimately fails.
        const bodyText = await res.clone().text().catch(() => '')
        const recoveredToken = isReResolveCode(bodyText)
            ? await serverReResolve()
            : await serverRefreshToken()
        if (recoveredToken) return request(recoveredToken)
    }

    return res
}
