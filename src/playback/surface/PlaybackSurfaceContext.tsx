"use client";

import { createContext } from "react";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";

/**
 * The transport half of attendee realtime playback.
 *
 * Both realtime providers publish exactly this: the persistent video element,
 * the connection, and who owns the main tile. Neither the shape of the stage nor
 * the stored definition appears here, which is what lets AttendeePlaybackSurface
 * be shared by a session that has layout and one that cannot.
 */

export type PlaybackSurfaceMode = "loading" | "blocked" | "playing" | "playing-muted";

export type PlaybackSurfaceState = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hiddenHostRef: React.RefObject<HTMLDivElement | null>;
  isConnected: boolean;
  /** Owner of the persistent video element. Undefined when nobody is publishing. */
  mainParticipant: WebiSalesProParticipant | undefined;
  mainParticipantHasActiveVideo: boolean;
  participantName: string | undefined;
  surfaceMode: PlaybackSurfaceMode;
  aspectRatio: string;
  reconnectStage: () => Promise<void>;
  handleStartPlayback: () => Promise<void>;
  handleUnmute: () => Promise<void>;
};

export const PlaybackSurfaceContext = createContext<PlaybackSurfaceState | null>(null);
