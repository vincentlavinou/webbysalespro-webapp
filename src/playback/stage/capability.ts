import type { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";

/**
 * Prefer the explicit token capability. The stage-state field is retained as
 * a backwards-compatible fallback while the backend rolls out the new field.
 */
export function supportsAttendeeStageLayout(
  playbackToken: AttendeeBroadcastServiceToken,
) {
  if (playbackToken.stream?.kind !== "realtime") return false;
  return (
    playbackToken.stage_layout_supported === true ||
    (playbackToken.stage_layout_supported === undefined &&
      playbackToken.stage_state?.applies_to_attendees === true)
  );
}

