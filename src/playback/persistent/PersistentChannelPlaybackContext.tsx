"use client";

import { createContext } from "react";
import type { PlayerState } from "amazon-ivs-player";
import type { PlayerMode } from "../player/ivs/hooks/use-ivs-player-core";

export type PersistentPlaybackStats = {
  latency?: number;
  bitrate?: number;
  resolution?: string;
  state?: string;
};

export type PersistentPlaybackState = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hiddenHostRef: React.RefObject<HTMLDivElement | null>;
  mode: PlayerMode;
  stats: PersistentPlaybackStats;
  playerState: PlayerState | "INIT";
  isMuted: boolean;
  hasPlayedRef: React.RefObject<boolean>;
  lastErrorMessage: string | null;
  playerVersion: number;
  playerRef: React.RefObject<import("amazon-ivs-player").Player | null>;
  updateStats: () => void;
  restoreToLive: (opts?: { forceReload?: boolean; gracePeriodMs?: number }) => Promise<void>;
  handleManualPlay: () => Promise<void>;
  tapToUnmute: () => void;
  scheduleRetry: () => void;
};

export const PersistentChannelPlaybackContext =
  createContext<PersistentPlaybackState | null>(null);
