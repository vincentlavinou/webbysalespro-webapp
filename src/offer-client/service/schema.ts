import { z } from "zod";

export const startCheckoutSchema = z.object({
    webinarId: z.string(),
    sessionId: z.string(),
    offerId: z.string(),
    token: z.string()
})

export const offersForSessionSchema = z.object({
    sessionId: z.string(),
    token: z.string()
})

export const offerVisibilityMetadataSchema = z.object({
  type: z.literal("webinar:offer:visibility"),
  payload: z.object({
    session_id: z.string(),
    id: z.string(), // offer_session.id
    status: z.enum(["scheduled", "live", "cooldown", "sold_out", "closed"]),
    opened_at: z.string().datetime().nullable(),
    closed_at: z.string().datetime().nullable(),
  }),
});