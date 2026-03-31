
import { z } from "zod";

export const registerForWebinarInput = z.object({
    webinar_id: z.string(),
    session_id: z.string().uuid().optional(),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Enter a valid email"),
    phone: z.string().optional().nullable(),
});

export const anonymousRegisterForWebinarInput = z.object({
    webinar_id: z.string(),
    anonymous_registrant_id: z.string().uuid().optional(),
});
