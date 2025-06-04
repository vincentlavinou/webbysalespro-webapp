export {
    createBroadcastServiceToken
} from './action'

export const broadcastApiUrl = process.env.BROADCAST_BASE_API_URL ? process.env.BROADCAST_BASE_API_URL : process.env.NEXT_PUBLIC_BROADCAST_BASE_API_URL ? 'https://api.webisalespro.com/api' : null