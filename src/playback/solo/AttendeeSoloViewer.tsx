"use client";

import { forwardRef } from "react";
import type { PlaybackStatus } from "../context/PlaybackRuntimeContext";
import {
  AttendeePlaybackSurface,
  type AttendeePlaybackSurfaceHandle,
} from "../surface/AttendeePlaybackSurface";
import { usePlaybackSurface } from "../surface/use-playback-surface";

type AttendeeSoloViewerProps = {
  sessionId: string;
  onPlaybackStatusChange?: (status: PlaybackStatus) => void;
};

export type AttendeeSoloViewerHandle = AttendeePlaybackSurfaceHandle;

/**
 * The attendee surface for a session with no layout setup: one publisher,
 * full-bleed, nothing to arrange.
 *
 * The host composites their screen and slides onto their own camera canvas, so
 * what arrives here is already the finished picture — `contain` because that
 * canvas is authored at a fixed aspect and cropping it would cut off slide
 * edges. If this file ever grows a tile list, the session it is rendering
 * belongs on the stage path instead.
 */
export const AttendeeSoloViewer = forwardRef<
  AttendeeSoloViewerHandle,
  AttendeeSoloViewerProps
>(function AttendeeSoloViewer({ sessionId, onPlaybackStatusChange }, ref) {
  const { aspectRatio } = usePlaybackSurface();

  return (
    <AttendeePlaybackSurface
      ref={ref}
      sessionId={sessionId}
      surfaceAspect={aspectRatio}
      attachKey="solo"
      objectFit="contain"
      pausedMessage="The presenter will be right back"
      onPlaybackStatusChange={onPlaybackStatusChange}
    >
      {(containerRef) => <div ref={containerRef} className="absolute inset-0" />}
    </AttendeePlaybackSurface>
  );
});
