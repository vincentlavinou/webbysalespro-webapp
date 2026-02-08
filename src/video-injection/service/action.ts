import { broadcastApiUrl } from "@/broadcast/service";
import { videoInjectionStateSchema, VideoInjectionState } from "./schema";

export async function getVideoInjectionState(
  sessionId: string,
  token: string
): Promise<VideoInjectionState> {
  const res = await fetch(
    `${broadcastApiUrl}/v1/sessions/${sessionId}/video-injections/state/?token=${token}`
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
