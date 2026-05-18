"use server"

import { actionClient } from "@/lib/safe-action"
import { attendeeFetch } from "@/lib/attendee-fetch"
import { handleStatus } from "@/lib/http"
import { webinarApiUrl } from "@/webinar/service"
import { getRealtimeConfigInputSchema, realtimeConfigSchema } from "./schema"
import { RealtimeConfig } from "./type"

export const getRealtimeConfigAction = actionClient
    .inputSchema(getRealtimeConfigInputSchema)
    .action(async (): Promise<RealtimeConfig> => {
        const response = await attendeeFetch(`${webinarApiUrl}/v2/realtime/config`, {
            method: "GET",
        })

        const checkedResponse = await handleStatus(response)
        const raw = await checkedResponse.json()

        return realtimeConfigSchema.parse(raw)
    })

export const getRealtimeConfig = async (sessionId: string): Promise<RealtimeConfig> => {
    const result = await getRealtimeConfigAction({ sessionId })

    if (result?.serverError) {
        throw new Error(result.serverError.detail)
    }
    if (result?.validationErrors) {
        throw new Error("Invalid request payload.")
    }
    if (!result?.data) {
        throw new Error("Unexpected empty response from getRealtimeConfigAction.")
    }

    return result.data
}
