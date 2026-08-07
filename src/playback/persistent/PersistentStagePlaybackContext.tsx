"use client";

import { createContext } from "react";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import type { StageStateDefinition } from "@/broadcast/service/type";
import type { ResolvedStageLayout } from "../stage/stage-state";

export type StageSurfaceMode = "loading" | "blocked" | "playing" | "playing-muted";

export type PersistentStagePlaybackState = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hiddenHostRef: React.RefObject<HTMLDivElement | null>;
  isConnected: boolean;
  mainParticipant: WebiSalesProParticipant | undefined;
  participants: WebiSalesProParticipant[];
  layout: ResolvedStageLayout;
  stageDefinition?: StageStateDefinition;
  mainParticipantHasActiveVideo: boolean;
  participantName: string | undefined;
  surfaceMode: StageSurfaceMode;
  aspectRatio: string;
  reconnectStage: () => Promise<void>;
  handleStartPlayback: () => Promise<void>;
  handleUnmute: () => Promise<void>;
};

export const PersistentStagePlaybackContext =
  createContext<PersistentStagePlaybackState | null>(null);
