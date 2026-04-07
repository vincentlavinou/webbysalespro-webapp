import { z } from "zod";

export const audienceRoleSchema = z.enum(["host", "presenter", "attendee"]);

export function createAudienceEventSchema<
  TType extends string,
  TPayload extends z.ZodTypeAny,
>(type: TType, payload: TPayload) {
  return z.object({
    type: z.literal(type),
    version: z.number().int(),
    session_id: z.string(),
    event_key: z.string(),
    emitted_at: z.string(),
    audience: z.array(audienceRoleSchema),
    payload,
  });
}
