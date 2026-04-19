"use client";

import { createContext } from "react";
import type { AndroidPlaybackMode } from "../player/ivs/hooks/use-android-ivs-player-core";

export type PersistentAndroidPlaybackState = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hiddenHostRef: React.RefObject<HTMLDivElement | null>;
  mode: AndroidPlaybackMode;
  errorMessage: string | null;
  qualityName: string | null;
  syncTimeMs: number | null;
  isMuted: boolean;
  isInPiP: boolean;
  isPiPSupported: boolean;
  handleStartMuted: () => void;
  handleStartWithSound: () => void;
  handleUnmute: () => void;
  restoreToLive: (opts?: { forceReload?: boolean; gracePeriodMs?: number }) => Promise<void>;
  enterPiP: () => void | Promise<void>;
  exitPiP: () => void;
};

export const PersistentAndroidPlaybackContext =
  createContext<PersistentAndroidPlaybackState | null>(null);
