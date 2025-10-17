'use server';
import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { broadcastApiUrl } from ".";
import { BroadcastServiceToken } from "./type";

export const createBroadcastServiceToken = async (webinarId: string, accessToken?: string, headers?: RequestHeaders) : Promise<BroadcastServiceToken> => {
    const response = await fetch(`${broadcastApiUrl}/v1/broadcast/token/`,{
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        method: 'POST',
        body: JSON.stringify({
            session: webinarId,
            access_token: accessToken
        })
    })

    return await response.json() as BroadcastServiceToken
}

export const setMainPresenter = async (webinarId: string, sessionId?: string, presenterId?: string, headers?: RequestHeaders) : Promise<BroadcastServiceToken> => {
    const response = await fetch(`${broadcastApiUrl}/v1/webinars/${webinarId}/sessions/${sessionId}/set-main-presenter/`,{
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        method: 'POST',
        body: JSON.stringify({
            presenter_id: presenterId
        })
    })

    return await response.json() as BroadcastServiceToken
}

export const sessionController = async (action: string, seriesId: string, sessionId: string, body: Record<string, unknown>, requestHeaders: () => Promise<RequestHeaders | undefined>) => {
    await fetch(`${broadcastApiUrl}/v1/series/${seriesId}/sessions/${sessionId}/${action}/`,{
        headers: {
          "Content-Type": "application/json",
          ... (await requestHeaders())
        },
        method: 'PATCH',
        body: JSON.stringify(body)
      })
}

export const recordEvent = async (name: string, sessionId: string, payload: Record<string, unknown> | undefined, token: string) => {
    const params = new URLSearchParams()
    params.set("token", token)
    await fetch(`${broadcastApiUrl}/v1/sessions/${sessionId}/events/?${params.toString()}`,{
        headers: {
          "Content-Type": "application/json"
        },
        method: 'POST',
        body: JSON.stringify({
            event_type: name,
            event_timestamp: new Date().toISOString(),
            payload: payload
        })
      })
}
