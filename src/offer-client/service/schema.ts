import { z } from "zod";

export const startCheckoutSchema = z.object({
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

export const offerScarcityUpdateMetadataSchema = z.object({
  type: z.literal("session:offer:scarcity:update"),
  payload: z.object({
    session_id: z.string(),
    offer_session_id: z.string(),
    mode: z.enum(["real", "manual", "none"]),
    display_type: z.enum(["percentage", "count"]),
    quantity_total: z.number().int(),
    display_percent_sold: z.number().nullable(),
    display_available_count: z.number().int().nullable(),
  }),
});

export const purchaseAnnouncementMetadataSchema = z.object({
  type: z.literal("session:offer:cta_announcement"),
  payload: z.object({
    session_id: z.string(),
    offer_session_id: z.string(),
    cta_entry_id: z.string(),
    first_name: z.string(),
    location: z.string(),
    source: z.enum(["preset", "real"]),
    content: z.string(),
    ttl_seconds: z.number().nullable(),
  }),
});