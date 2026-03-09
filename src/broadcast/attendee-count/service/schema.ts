import { z } from "zod";

export const attendeeCountMetadataSchema = z.object({
  type: z.literal("webinar:attendee_count:update"),
  payload: z.object({
    session_id: z.string(),
    is_attendee_count_visible: z.boolean(),
    count: z.number().int(),
  }),
});

export type AttendeeCountMetadataEvent = z.infer<typeof attendeeCountMetadataSchema>;
