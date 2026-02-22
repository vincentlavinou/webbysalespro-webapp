import { z } from "zod";

const pinnedAnnouncementSchema = z.object({
    id: z.string(),
    content: z.string(),
    cta_label: z.string(),
    cta_url: z.string(),
    order: z.number().int(),
    pinned_at: z.string(),
    pinned_by_type: z.enum(["host", "presenter", "moderator"]),
});

export const chatConfigUpdateSchema = z.object({
    type: z.literal("chat:config:update"),
    payload: z.object({
        session_id: z.string(),
        chat_session_id: z.string(),
        is_enabled: z.boolean(),
        mode: z.enum(["public", "private", "locked"]),
        is_active: z.boolean(),
        opened_at: z.string().nullable(),
        closed_at: z.string().nullable(),
        pinned_announcements: z.array(pinnedAnnouncementSchema),
    }),
});

export const getAttendeeChatSessionSchema = z.object({
    token: z.string(),
    sessionId: z.string().uuid()
})