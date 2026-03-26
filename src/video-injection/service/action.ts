'use server'

import { broadcastApiUrl } from "@/broadcast/service";
import { getAttendeeAuthHeader } from "@/lib/attendee-request";
import { videoInjectionStateSchema, VideoInjectionState } from "./schema";

export async function getVideoInjectionState(
  sessionId: string,
): Promise<VideoInjectionState> {
  const authHeader = await getAttendeeAuthHeader()
  const res = await fetch(
    `${broadcastApiUrl}/v1/sessions/${sessionId}/video-injections/state/`,
    {
      headers: { ...authHeader },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    return { active: false };
  }

  const json = await res.json();
  const parsed = videoInjectionStateSchema.safeParse(json);

  if (!parsed.success) {
    return { active: false };
  }

  return parsed.data;
}
