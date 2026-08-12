import type { StageState } from "@/broadcast/service/type";

/**
 * Whether this attendee should run the stage-layout path at all.
 *
 * `applies_to_attendees` is the backend's own answer and requires
 * `layout_setup_available` — an active co-host on the webinar — as of
 * "Gate stage-state attendee delivery on layout setup". A session without one
 * collapses to a single publisher, so there is nothing for a layout to arrange
 * and the console is told the same thing.
 *
 * The explicit token capability wins when the backend sends it; the stage-state
 * field is the backwards-compatible fallback while that field rolls out.
 */
export function resolveStageLayoutEnabled(
  layoutSupported: boolean | undefined,
  stageState: StageState | undefined,
): boolean {
  if (layoutSupported !== undefined) return layoutSupported === true;
  return stageState?.applies_to_attendees === true;
}
