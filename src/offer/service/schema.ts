import { z } from "zod";

export const startCheckoutSchema = z.object({
    webinarId: z.string(),
    sessionId: z.string(),
    offerId: z.string(),
    token: z.string()
})