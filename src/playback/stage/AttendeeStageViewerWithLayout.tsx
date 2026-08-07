"use client";

import { forwardRef } from "react";
import {
  AttendeeStageViewer,
  type AttendeeStageViewerHandle,
} from "./AttendeeStageViewer";

/**
 * Stage-layout-capable attendee surface.
 *
 * This is intentionally a separate entry point from AttendeeStageViewer. The
 * existing viewer remains the compatibility path for sessions whose token
 * does not advertise attendee stage layouts. Once the host/media path is
 * enabled for the capability, this component is the safe place to evolve the
 * backend-authoritative layout renderer without changing legacy sessions.
 */
export const AttendeeStageViewerWithLayout = forwardRef<
  AttendeeStageViewerHandle,
  React.ComponentProps<typeof AttendeeStageViewer>
>(function AttendeeStageViewerWithLayout(props, ref) {
  return <AttendeeStageViewer {...props} ref={ref} />;
});

