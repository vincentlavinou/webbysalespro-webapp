import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response"
import { ChatConfigUpdate, ChatService } from "./type"
import { chatApiUrl } from "."
import { actionClient } from "@/lib/safe-action"
import { getAttendeeChatSessionSchema } from "./schema"

export const tokenProvider = async (session: string, accessToken?: string, getRequestHeaders?: () => Promise<RequestHeaders | undefined>) : Promise<ChatService> => {
    const response = await fetch(`${chatApiUrl}/v1/chat/token/`,{
        headers: {
            'Content-Type': 'application/json',
            ...(await getRequestHeaders?.())
        },
        method: 'POST',
        body: JSON.stringify({
            session: session,
            access_token: accessToken
        })
    })

    return await response.json() as ChatService
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
            method: 'GET'
        }
    )
    const result = await response.json() as ChatConfigUpdate
    return result
})