"use client";

import { createContext } from "react";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";

export type StageSurfaceMode = "loading" | "blocked" | "playing" | "playing-muted";

export type PersistentStagePlaybackState = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hiddenHostRef: React.RefObject<HTMLDivElement | null>;
  isConnected: boolean;
  mainParticipant: WebiSalesProParticipant | undefined;
  mainParticipantHasActiveVideo: boolean;
  presenterName: string | undefined;
  surfaceMode: StageSurfaceMode;
  aspectRatio: string;
  reconnectStage: () => Promise<void>;
  handleStartPlayback: () => Promise<void>;
  handleUnmute: () => Promise<void>;
};

export const PersistentStagePlaybackContext =
  createContext<PersistentStagePlaybackState | null>(null);
