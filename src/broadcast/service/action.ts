'use server';
import { broadcastApiUrl } from ".";
import { BroadcastServiceToken } from "./type";

export const createBroadcastServiceToken = async (webinarId: string, accessToken?: string) : Promise<BroadcastServiceToken> => {
    const response = await fetch(`${broadcastApiUrl}/v1/broadcast/token/`,{
        headers: {
            'Content-Type': 'application/json'
        },
        method: 'POST',
        body: JSON.stringify({
            webinar: webinarId,
            access_token: accessToken
        })
    })

    return await response.json() as BroadcastServiceToken
}