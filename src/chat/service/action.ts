'use server'

import { z } from "zod"
import { ChatConfigUpdate, ChatService } from "./type"
import { chatApiUrl } from "."
import { actionClient } from "@/lib/safe-action"
import { getAttendeeChatSessionSchema } from "./schema"
import { handleStatus } from "@/lib/http"
import { attendeeFetch } from "@/lib/attendee-fetch"

const getChatTokenSchema = z.object({ sessionId: z.string() })

export const getChatTokenAction = actionClient
    .inputSchema(getChatTokenSchema)
    .action(async ({ parsedInput }) => {
        const response = await attendeeFetch(`${chatApiUrl}/v1/chat/token/`, {
            method: 'POST',
            body: JSON.stringify({ session: parsedInput.sessionId }),
        })
        const checkedResponse = await handleStatus(response)
        return await checkedResponse.json() as ChatService
    })

export const getAttendeeChatSession = actionClient.inputSchema(
    getAttendeeChatSessionSchema
).action(async ({ parsedInput }) => {
    const response = await attendeeFetch(
        `${chatApiUrl}/v1/sessions/${parsedInput.sessionId}/chat/`,
        { method: 'GET' }
    )
    const checkedResponse = await handleStatus(response)
    const result = await checkedResponse.json() as ChatConfigUpdate
    return result
})
