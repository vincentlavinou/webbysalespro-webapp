import { z } from "zod";

export const videoInjectionUpdateMetadataSchema = z.object({
  type: z.literal("webinar:video-injection:update"),
  payload: z.object({
    session_id: z.string(),
    action: z.enum(["start", "stop"]),
    video_injection_id: z.string().optional(),
    playback_url: z.string().optional(),
    title: z.string().optional(),
    duration_ms: z.number().optional(),
  }),
});

export type VideoInjectionUpdateMetadata = z.infer<
  typeof videoInjectionUpdateMetadataSchema
>;

export const videoInjectionStateSchema = z.object({
  active: z.boolean(),
  video_injection_id: z.string().nullable().optional(),
  playback_url: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  duration_ms: z.number().nullable().optional(),
  elapsed_seconds: z.number().nullable().optional(),
});

export type VideoInjectionState = z.infer<typeof videoInjectionStateSchema>;
