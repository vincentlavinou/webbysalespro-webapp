'use server'

import { z } from "zod"
import { ChatConfigUpdate, ChatService } from "./type"
import { chatApiUrl } from "."
import { actionClient } from "@/lib/safe-action"
import { getAttendeeChatSessionSchema } from "./schema"
import { handleStatus } from "@/lib/http"
import { getAttendeeAuthHeader } from "@/lib/attendee-request"

const getChatTokenSchema = z.object({ sessionId: z.string() })

export const getChatTokenAction = actionClient
    .inputSchema(getChatTokenSchema)
    .action(async ({ parsedInput }) => {
        const authHeader = await getAttendeeAuthHeader()
        const response = await fetch(`${chatApiUrl}/v1/chat/token/`, {
            headers: {
                'Content-Type': 'application/json',
                ...authHeader,
            },
            method: 'POST',
            cache: "no-store",
            body: JSON.stringify({ session: parsedInput.sessionId }),
        })
        const checkedResponse = await handleStatus(response)
        return await checkedResponse.json() as ChatService
    })

export const getAttendeeChatSession = actionClient.inputSchema(
    getAttendeeChatSessionSchema
).action(async ({ parsedInput }) => {
    const authHeader = await getAttendeeAuthHeader()
    const response = await fetch(
        `${chatApiUrl}/v1/sessions/${parsedInput.sessionId}/chat/`,
        {
            headers: {
                'Content-Type': 'application/json',
                ...authHeader,
            },
            method: 'GET',
            cache: "no-store",
        }
    )
    const checkedResponse = await handleStatus(response)
    const result = await checkedResponse.json() as ChatConfigUpdate
    return result
})
