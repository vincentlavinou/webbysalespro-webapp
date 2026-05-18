import { z } from "zod"

export const realtimeConfigSchema = z.object({
    use_pusher: z.boolean(),
    key: z.string(),
    cluster: z.string(),
    ws_host: z.string().nullable(),
    ws_port: z.number().int().nullable(),
    force_tls: z.boolean(),
})

export const getRealtimeConfigInputSchema = z.object({
    sessionId: z.string().min(1),
})
