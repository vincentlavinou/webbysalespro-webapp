
import { z } from "zod";
import { createAudienceEventSchema } from "@/audience-events/service/schema";
import { WebinarSessionStatus } from "./enum";

export const registerForWebinarInput = z.object({
    webinar_id: z.string(),
    session_id: z.string().uuid().optional(),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().optional().nullable(),
    embed_source: z.string().optional(),
});

export const anonymousRegisterForWebinarInput = z.object({
    webinar_id: z.string(),
    anonymous_registrant_id: z.string().uuid().optional(),
});

export const webinarSessionUpdateAudienceEventSchema = createAudienceEventSchema(
    "webinar:session:update",
    z.object({
        session_id: z.string(),
        status: z.nativeEnum(WebinarSessionStatus),
    }),
);
