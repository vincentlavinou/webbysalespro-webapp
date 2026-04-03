'use server'
import { actionClient } from "@/lib/safe-action";
import { QueryWebinar, RegisterV2Response, SeriesSession, Webinar } from "./type";
import { emptyPage, PaginationPage } from "@/components/pagination";
import { webinarApiUrl } from ".";
import { AlreadyRegisteredError } from "./error";
import { handleStatus } from "@/lib/http";
import { ApiError } from "@/lib/error";
import { resolveAttendeeLocation } from "@/lib/geo";
import { z } from "zod";
import { anonymousRegisterForWebinarInput, registerForWebinarInput } from "./schema";
import { cache } from "react";

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

const getWebinarCached = cache(async (id: string, fresh: boolean): Promise<Webinar> => {
    const response = await fetch(
        `${webinarApiUrl}/v1/webinars/${id}/public/`,
        fresh
            ? {
                cache: "no-store",
            }
            : {
                next: {
                    revalidate: 60,
                    tags: [`webinar-${id}`],
                },
            }
    )
    return await response.json()
})

export async function getWebinar(id: string, options?: GetWebinarOptions): Promise<Webinar> {
    return getWebinarCached(id, Boolean(options?.fresh))
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
    const { getAttendeeAuthHeader } = await import('@/lib/attendee-request')
    const authHeader = await getAttendeeAuthHeader()
    const response = await fetch(`${webinarApiUrl}/v1/sessions/${parsedInput.id}/attendee-hydrate/`, {
        headers: { ...authHeader },
        cache: "no-store",
    })
    const checkedResponse = await handleStatus(response)
    return await checkedResponse.json() as SeriesSession
})


export const getWebinarFromSession = actionClient
    .inputSchema(sessionIdSchema)
    .action( async ({parsedInput}) => {
        const { getAttendeeAuthHeader } = await import('@/lib/attendee-request')
        const authHeader = await getAttendeeAuthHeader()
        const response = await fetch(`${webinarApiUrl}/v1/sessions/${parsedInput.id}/webinar/`, {
            headers: { ...authHeader },
            cache: "no-store",
        })
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
            const { webinar_id, session_id, first_name, last_name, email, phone } = input.parsedInput;

            const baseRequestBody: AttendeeRequestBody = {
                first_name,
                last_name,
                email,
                phone: phone ?? null,
                registration_source: 'public_registration_page',
                ...(session_id ? { session_id } : {}),
            };

            const location = await resolveAttendeeLocation();
            const enrichedRequestBody: AttendeeRequestBody = {
                ...baseRequestBody,
                ...(location?.city ? { city: location.city } : {}),
                ...(location?.state ? { state: location.state } : {}),
                ...(location?.countryCode ? { country: location.countryCode } : {}),
            };

            const submitRegistration = async (requestBody: AttendeeRequestBody) => {
                const response = await fetch(
                    `${webinarApiUrl}/v2/webinars/${webinar_id}/registrants/`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(requestBody),
                        cache: "no-store",
                    }
                );

                return handleStatus(response);
            };

            let response: Response;

            try {
                response = await submitRegistration(enrichedRequestBody);
            } catch (error) {
                const requestWasEnriched =
                    enrichedRequestBody.city !== undefined ||
                    enrichedRequestBody.state !== undefined ||
                    enrichedRequestBody.country !== undefined;

                if (!requestWasEnriched || !shouldRetryWithoutLocation(error)) {
                    throw error;
                }

                response = await submitRegistration(baseRequestBody);
            }

            const result = await response.json() as RegisterV2Response

            return result
        }
    );

export const anonymousRegisterForWebinarAction = actionClient
    .inputSchema(anonymousRegisterForWebinarInput)
    .action(async ({ parsedInput }) => {
        const headers: HeadersInit = {};

        if (parsedInput.anonymous_registrant_id) {
            headers["X-Anonymous-Registrant-ID"] = parsedInput.anonymous_registrant_id;
        }

        const response = await fetch(
            `${webinarApiUrl}/v2/webinars/${parsedInput.webinar_id}/registrants/anonymous/`,
            {
                method: "POST",
                headers,
                cache: "no-store",
            }
        );

        const checkedResponse = await handleStatus(response);
        return await checkedResponse.json() as RegisterV2Response;
    });
