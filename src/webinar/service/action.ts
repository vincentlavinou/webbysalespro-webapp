'use server'
import { actionClient } from "@/lib/safe-action";
import { QueryWebinar, RegistrationEmbedConfig, RegisterV2Response, SeriesSession, Webinar, WebinarPauseInfo, WebinarPublicState } from "./type";
import { emptyPage, PaginationPage } from "@/components/pagination";
import { webinarApiUrl } from ".";
import { AlreadyRegisteredError } from "./error";
import { handleStatus } from "@/lib/http";
import { ApiError, safeDecodeErrorPayload } from "@/lib/error";
import { resolveAttendeeLocation } from "@/lib/geo";
import { retryTransientRequest } from "@/lib/retry";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { anonymousRegisterForWebinarInput, registerForWebinarInput } from "./schema";
import { cache } from "react";
import { extractShortCode, resolveShortLink } from "./short-link";

export async function getWebinars(query?: QueryWebinar) {
    // Fetch all webinars without search query
    const params = new URLSearchParams();
    if (query?.search) {
        params.set('search', query.search);
    }
    if (query?.page) {
        params.set('page', query.page.toString());
    }
    if (query?.page_size) {
        params.set('page_size', query.page_size.toString());
    }

    params.set('ordering', query?.ordering || '-created_at'); // Default ordering by created_at descending

    params.set('status', query?.status?.join(',') || ['scheduled'].join(','))

    const hasLiveFilter = query?.status?.includes("in_progress") ?? false;
    const response = await fetch(`${webinarApiUrl}/v1/webinars/public/?${params.toString()}`, hasLiveFilter
      ? {
          // Live lists should always bypass cache to avoid stale status transitions.
          cache: "no-store",
        }
      : {
          next: {
              revalidate: 60,
              tags: ["webinars-public"],
          },
        })
    const data: PaginationPage<Webinar[]> = await response.json()
    return data ? data : emptyPage<Webinar[]>([]);
}

type GetWebinarOptions = {
    fresh?: boolean
}

function isWebinarPauseInfo(value: unknown): value is WebinarPauseInfo {
    return Boolean(
        value &&
        typeof value === "object" &&
        typeof (value as Partial<WebinarPauseInfo>).support_email === "string"
    );
}

const getWebinarCached = cache(async (id: string, fresh: boolean): Promise<Webinar> => {
    const fetchOptions: RequestInit = fresh
        ? { cache: "no-store" }
        : { next: { revalidate: 60, tags: [`webinar-${id}`] } }

    const response = await retryTransientRequest(
        () => fetch(`${webinarApiUrl}/v1/webinars/${id}/public/`, fetchOptions),
        { method: "GET" },
    )

    if (!response.ok) {
        return {} as Webinar
    }
    return await response.json()
})

export async function getWebinar(id: string, options?: GetWebinarOptions): Promise<Webinar> {
    return getWebinarCached(id, Boolean(options?.fresh))
}

export async function getPublicWebinarState(id: string, options?: GetWebinarOptions): Promise<WebinarPublicState> {
    const fetchOptions: RequestInit = options?.fresh
        ? { cache: "no-store" }
        : { next: { revalidate: 60, tags: [`webinar-${id}`] } }

    const response = await retryTransientRequest(
        () => fetch(`${webinarApiUrl}/v1/webinars/${id}/public/`, fetchOptions),
        { method: "GET" },
    )

    if (response.ok) {
        return {
            kind: "webinar",
            webinar: await response.json(),
        }
    }

    if (response.status === 404) {
        const { decoded, payload } = await safeDecodeErrorPayload(response)
        if (decoded && payload?.code === "WEB-PAUSED" && isWebinarPauseInfo(payload.pause_info)) {
            return {
                kind: "paused",
                pauseInfo: payload.pause_info,
            }
        }
    }

    return { kind: "not_found" }
}

export async function getRegistrationEmbedConfig(webinarId: string, source: string): Promise<RegistrationEmbedConfig | null> {
    const params = new URLSearchParams({ source })
    const response = await fetch(
        `${webinarApiUrl}/v1/webinars/${webinarId}/registration-embeds/by-source/?${params.toString()}`,
        {
            next: {
                revalidate: 60,
                tags: [`webinar-${webinarId}`, `registration-embed-${webinarId}`],
            },
        }
    )
    if (!response.ok) return null
    return await response.json() as RegistrationEmbedConfig
}

export async function registerForWebinar(formData: FormData): Promise<void> {
    const webinarId = formData.get("webinar_id") as string
    const sessionId = formData.get("session_id") as string
    const request = {
        "session_ids": [sessionId],
        "first_name": formData.get("first_name") as string,
        "last_name": formData.get("last_name") as string,
        "email": formData.get("email") as string,
        "phone": formData.get("phone") as string | null,
    }
    const response = await fetch(`${webinarApiUrl}/v1/webinars/${webinarId}/attendees/`, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(request)
    })

    if (response.status >= 400) {
        const errorData = await response.json()
        if (errorData.code === 'already_registered_single') {
            throw new AlreadyRegisteredError(errorData.detail)
        } else {
            throw new Error(errorData.detail || 'Unknown error')
        }
    }
}

export async function updateSession(formData: FormData): Promise<void> {
    const webinarId = formData.get("webinar_id") as string
    const sessionId = formData.get("session_id") as string

    const request = {
        "session_ids": [sessionId],
        "first_name": formData.get("first_name") as string,
        "last_name": formData.get("last_name") as string,
        "email": formData.get("email") as string
    }

    const response = await fetch(`${webinarApiUrl}/v1/webinars/${webinarId}/attendees/`, {
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify(request)
    })

    if (response.status >= 400) {
        const errorData = await response.json()
        if (errorData.code === 'already_registered_single') {
            throw new AlreadyRegisteredError(errorData.detail)
        } else {
            throw new Error(errorData.detail || 'Unknown error')
        }
    }
}

const sessionIdSchema = z.object({
    id: z.string(),
})

const sessionToWebinarSchema = z.object({
    session_id: z.string(),
})

export const getSessionAction = actionClient.inputSchema(sessionIdSchema).action(async ({parsedInput}) => {
    const { attendeeFetch } = await import('@/lib/attendee-fetch')
    const response = await attendeeFetch(
        `${webinarApiUrl}/v1/sessions/${parsedInput.id}/attendee-hydrate/`,
        { method: 'GET' }
    )
    const checkedResponse = await handleStatus(response)
    return await checkedResponse.json() as SeriesSession
})


export const getWebinarFromSession = actionClient
    .inputSchema(sessionIdSchema)
    .action( async ({parsedInput}) => {
        const { attendeeFetch } = await import('@/lib/attendee-fetch')
        const response = await attendeeFetch(
            `${webinarApiUrl}/v1/sessions/${parsedInput.id}/webinar/`,
            { method: 'GET' }
        )
        const checkedResponse = await handleStatus(response)
        return await checkedResponse.json() as Webinar
    })

export const getPublicWebinarIdFromSessionAction = actionClient
    .inputSchema(sessionToWebinarSchema)
    .action(async ({ parsedInput }) => {
        const response = await fetch(
            `${webinarApiUrl}/v1/sessions/${parsedInput.session_id}/webinar/id/`,
            { cache: 'no-store' }
        )
        const checkedResponse = await handleStatus(response)
        return await checkedResponse.json() as { session_id: string; webinar_id: string }
    })

export type RegisterForWebinarInput = z.infer<typeof registerForWebinarInput>;
export type AnonymousRegisterForWebinarInput = z.infer<typeof anonymousRegisterForWebinarInput>;

type AttendeeRequestBody = {
    session_id?: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    city?: string;
    state?: string;
    country?: string;
    registration_source: string;
    embed_source?: string;
    ref_source?: string;
}

async function resolveRegistrationShortLinks(
    result: RegisterV2Response
): Promise<RegisterV2Response> {
    const grants = await Promise.all(
        result.grants.map(async (grant) => {
            if (!grant.join_url) {
                return grant;
            }

            const shortCode = extractShortCode(grant.join_url);
            if (!shortCode) {
                return grant;
            }

            let resolution;
            try {
                resolution = await resolveShortLink(shortCode);
            } catch (error) {
                Sentry.captureException(error, {
                    tags: { action: "registration", step: "resolve-short-link" },
                });
                return { ...grant, short_link_resolution_failed: true };
            }

            if (resolution.status === "expired") {
                return { ...grant, join_url: undefined };
            }

            return { ...grant, join_url: resolution.url };
        })
    );

    return { ...result, grants };
}

function shouldRetryWithoutLocation(error: unknown): boolean {
    if (!(error instanceof ApiError)) {
        return false;
    }

    if (error.status !== 400 && error.status !== 422) {
        return false;
    }

    const detail = error.payload?.detail.toLowerCase() ?? error.message.toLowerCase();
    return detail.includes("city") || detail.includes("state") || detail.includes("country") || detail.includes("unknown") || detail.includes("unexpected");
}

export const registerForWebinarAction = actionClient
    .inputSchema(registerForWebinarInput)
    .action(
        async (input) => {
            const { webinar_id, session_id, first_name, last_name, email, phone, embed_source, ref_source } = input.parsedInput;

            const baseRequestBody: AttendeeRequestBody = {
                first_name,
                last_name,
                email,
                phone: phone ?? null,
                registration_source: embed_source ? 'embed' : 'public_registration_page',
                ...(session_id ? { session_id } : {}),
                ...(embed_source ? { embed_source } : {}),
                ...(ref_source ? { ref_source } : {}),
            };

            const location = await resolveAttendeeLocation();
            const enrichedRequestBody: AttendeeRequestBody = {
                ...baseRequestBody,
                ...(location?.city ? { city: location.city } : {}),
                ...(location?.state ? { state: location.state } : {}),
                ...(location?.countryCode ? { country: location.countryCode } : {}),
            };

            const submitRegistration = async (requestBody: AttendeeRequestBody, timeoutMs: number) => {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeoutMs);
                try {
                    const response = await fetch(
                        `${webinarApiUrl}/v2/webinars/${webinar_id}/registrants/`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(requestBody),
                            cache: "no-store",
                            signal: controller.signal,
                        }
                    );
                    return handleStatus(response);
                } finally {
                    clearTimeout(timer);
                }
            };

            let response: Response;
            const requestWasEnriched =
                enrichedRequestBody.city !== undefined ||
                enrichedRequestBody.state !== undefined ||
                enrichedRequestBody.country !== undefined;

            try {
                response = await submitRegistration(enrichedRequestBody, 5000);
            } catch (firstError) {
                Sentry.captureException(firstError, {
                    level: "warning",
                    tags: { action: "registration", attempt: "first" },
                    extra: { webinar_id, email, session_id, requestWasEnriched },
                });
                // Retry: drop location fields if they caused a validation error,
                // otherwise retry the same payload. Registration is idempotent.
                const retryBody = requestWasEnriched && shouldRetryWithoutLocation(firstError)
                    ? baseRequestBody
                    : enrichedRequestBody;
                try {
                    response = await submitRegistration(retryBody, 2000);
                } catch (retryError) {
                    Sentry.captureException(retryError, {
                        level: "error",
                        tags: { action: "registration", attempt: "retry" },
                        extra: { webinar_id, email, session_id, requestWasEnriched },
                    });
                    throw retryError;
                }
            }

            const result = await response.json() as RegisterV2Response

            return resolveRegistrationShortLinks(result)
        }
    );

export const anonymousRegisterForWebinarAction = actionClient
    .inputSchema(anonymousRegisterForWebinarInput)
    .action(async ({ parsedInput }) => {
        const headers: HeadersInit = {};

        if (parsedInput.anonymous_registrant_id) {
            headers["X-Anonymous-Registrant-ID"] = parsedInput.anonymous_registrant_id;
        }

        const response = await retryTransientRequest(
            () =>
                fetch(
                    `${webinarApiUrl}/v2/webinars/${parsedInput.webinar_id}/registrants/anonymous/`,
                    {
                        method: "POST",
                        headers,
                        cache: "no-store",
                    }
                ),
            { method: "POST" }
        );

        const checkedResponse = await handleStatus(response);
        const result = await checkedResponse.json() as RegisterV2Response;
        return resolveRegistrationShortLinks(result);
    });
