import { z } from "zod";
import { createAudienceEventSchema } from "@/audience-events/service/schema";

export const attendeeCountMetadataSchema = createAudienceEventSchema(
  "webinar:attendee_count:update",
  z.object({
    is_attendee_count_visible: z.boolean(),
    count: z.number().int(),
  }),
);

export type AttendeeCountMetadataEvent = z.infer<typeof attendeeCountMetadataSchema>;
