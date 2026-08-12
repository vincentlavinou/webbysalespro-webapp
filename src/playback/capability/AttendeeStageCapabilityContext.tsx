"use client";

import { createContext, useContext } from "react";

/**
 * Published by the realtime playback entry point so the experience layouts can
 * pick a viewer without re-deriving the capability from the token — and so they
 * follow it when it changes mid-session.
 */
export const AttendeeStageCapabilityContext = createContext<boolean | null>(null);

/**
 * Whether the stage-layout viewer applies. False outside a realtime session,
 * which is correct: channel playback has no stage to arrange.
 */
export function useAttendeeStageLayoutEnabled() {
  return useContext(AttendeeStageCapabilityContext) ?? false;
}
