'use server'
import { actionClient } from "@/lib/safe-action";
import { QueryWebinar, SeriesSession, Webinar } from "./type";
import { emptyPage, PaginationPage } from "@/components/pagination";
import { webinarApiUrl } from ".";
import { AlreadyRegisteredError } from "./error";
import { handleStatus } from "@/lib/http";
import { z } from "zod";
import { registerForWebinarInput } from "./schema";

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

    const response = await fetch(`${webinarApiUrl}/v1/webinars/public/?${params.toString()}`)
    const data: PaginationPage<Webinar[]> = await response.json()
    return data ? data : emptyPage<Webinar[]>([]);
}

export async function getWebinar(id: string): Promise<Webinar> {
    const response = await fetch(`${webinarApiUrl}/v1/webinars/${id}/public/`)
    return await response.json()
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

const sessionIdTokenSchema = z.object({
    id: z.string(),
    token: z.string()
})

export const getSessionAction = actionClient.inputSchema(sessionIdTokenSchema).action(async ({parsedInput}) => {
    const response = await fetch(`${webinarApiUrl}/v1/sessions/${parsedInput.id}/attendee-hydrate/?token=${parsedInput.token}`)
    return await response.json() as SeriesSession
})


export const getWebinarFromSession = actionClient
    .inputSchema(sessionIdTokenSchema)
    .action( async ({parsedInput}) => {
        const response = await fetch(`${webinarApiUrl}/v1/sessions/${parsedInput.id}/webinar/?token=${parsedInput.token}`)
        return await response.json() as Webinar
    })

export type RegisterForWebinarInput = z.infer<typeof registerForWebinarInput>;

export const registerForWebinarAction = actionClient
    .inputSchema(registerForWebinarInput)
    .action(
        async (input) => {
            const { webinar_id, session_id, first_name, last_name, email, phone } = input.parsedInput;

            const requestBody = {
                session_ids: [session_id],
                first_name,
                last_name,
                email,
                phone: phone ?? null,
            };

            let response = await fetch(
                `${webinarApiUrl}/v1/webinars/${webinar_id}/attendees/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody),
                    cache: "no-store",
                }
            );

            response = await handleStatus(response)

            return { success: response.ok };
        }
    );
