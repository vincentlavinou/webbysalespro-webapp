import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response"
import { ChatConfigUpdate, ChatService } from "./type"
import { chatApiUrl } from "."
import { actionClient } from "@/lib/safe-action"
import { getAttendeeChatSessionSchema } from "./schema"
import { handleStatus } from "@/lib/http"

export const tokenProvider = async (session: string, accessToken?: string, getRequestHeaders?: () => Promise<RequestHeaders | undefined>) : Promise<ChatService> => {
    const response = await fetch(`${chatApiUrl}/v1/chat/token/`,{
        headers: {
            'Content-Type': 'application/json',
            ...(await getRequestHeaders?.())
        },
        method: 'POST',
        cache: "no-store",
        body: JSON.stringify({
            session: session,
            access_token: accessToken
        })
    })

    const checkedResponse = await handleStatus(response)
    return await checkedResponse.json() as ChatService
}

export const getAttendeeChatSession = actionClient.inputSchema(
    getAttendeeChatSessionSchema
).action( async ({parsedInput}) => {

    const response = await fetch(
        `${chatApiUrl}/v1/sessions/${parsedInput.sessionId}/chat/?token=${parsedInput.token}`,
        {
            headers: {
                'Content-Type': 'application/json',
            },
            method: 'GET',
            cache: "no-store",
        }
    )
    const checkedResponse = await handleStatus(response)
    const result = await checkedResponse.json() as ChatConfigUpdate
    return result
})
