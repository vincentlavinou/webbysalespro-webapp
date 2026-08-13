"use client";

import { z } from "zod";
import { useAudienceEvent as useSharedAudienceEvent } from "@lavinou/webbysalespro/realtime/react";
import type { AudienceEvent, AudienceRole } from "@lavinou/webbysalespro/realtime";

/**
 * Thin adapter over `@lavinou/webbysalespro/realtime`.
 *
 * The envelope pipeline — validation, audience gating, `event_key`
 * de-duplication, stale rejection, signature collapsing — now lives in the
 * shared module, which merged this hook with the near-identical
 * `usePlaybackMetadataEvent` that sat beside it. That merge fixed several
 * things one copy or the other got wrong; see the package CHANGELOG for 0.1.2.
 *
 * Only two things stay here, because only they are app-specific:
 *
 *   1. zod. The package ships zero runtime dependencies and cannot import it,
 *      so validation is injected. This is where `safeParse` is adapted.
 *   2. The default audience. The shared hook requires `targetAudience`
 *      explicitly, precisely because the copy that left it implicit ended up
 *      applying host-targeted events on attendee surfaces.
 *
 * Requires a `RealtimeEventsProvider` above it, which `WebinarProvider` mounts.
 */
export function useAudienceEvent<
  TType extends string,
  TPayload extends Record<string, unknown>,
>(options: {
  eventType: TType;
  schema: z.ZodType<AudienceEvent<TType, TPayload>>;
  sessionId?: string;
  /**
   * Defaults to `"attendee"`, which is what this surface already assumed. A
   * host or presenter viewing it therefore still receives only
   * attendee-targeted events — unchanged from before, and worth revisiting
   * separately rather than inside a migration.
   */
  targetAudience?: AudienceRole;
  onEvent: (evt: AudienceEvent<TType, TPayload>) => void;
  getEventKey?: (evt: AudienceEvent<TType, TPayload>) => string | undefined;
  getStateScope?: (evt: AudienceEvent<TType, TPayload>) => string | undefined;
  /**
   * Rarely needed now: the shared default already compares lexicographically,
   * which is chronological for real `event_key`s because the backend zero-pads
   * the millisecond timestamp ahead of the uuid.
   */
  compareEventKeys?: (incoming: string, latestApplied: string) => number;
  getSignature?: (evt: AudienceEvent<TType, TPayload>) => string;
}) {
  const { schema, targetAudience = "attendee", ...rest } = options;

  useSharedAudienceEvent<TType, TPayload>({
    ...rest,
    targetAudience,
    validate: (raw) => {
      const parsed = schema.safeParse(raw);
      return parsed.success
        ? { ok: true, value: parsed.data }
        : { ok: false, error: parsed.error.message };
    },
  });
}
