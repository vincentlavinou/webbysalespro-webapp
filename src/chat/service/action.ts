import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response"
import { ChatService } from "./type"
import { chatApiUrl } from "."

export const tokenProvider = async (session: string, accessToken?: string, headers?: RequestHeaders) : Promise<ChatService> => {
    const response = await fetch(`${chatApiUrl}/v1/chat/token/`,{
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        method: 'POST',
        body: JSON.stringify({
            session: session,
            access_token: accessToken
        })
    })

    return await response.json() as ChatService
}