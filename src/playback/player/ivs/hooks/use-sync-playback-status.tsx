"use client";

import { useEffect } from "react";
import { PlayerState } from "amazon-ivs-player";
import type { PlaybackStatus } from "@/playback/context/PlaybackRuntimeContext";
import type { AndroidPlaybackMode } from "./use-android-ivs-player-core";
import type { PlayerMode } from "./use-ivs-player-core";

type UseSyncPlaybackStatusOptions =
  | {
      kind: "ivs";
      mode: PlayerMode;
      playerState: PlayerState | "INIT";
      onPlaybackStatusChange?: (status: PlaybackStatus) => void;
    }
  | {
      kind: "android";
      mode: AndroidPlaybackMode;
      onPlaybackStatusChange?: (status: PlaybackStatus) => void;
    };

export function useSyncPlaybackStatus(options: UseSyncPlaybackStatusOptions) {
  useEffect(() => {
    const { onPlaybackStatusChange } = options;
    if (!onPlaybackStatusChange) return;

    if (options.kind === "android") {
      const { mode } = options;

      if (mode === "ready") {
        onPlaybackStatusChange("ready");
        return;
      }

      if (mode === "buffering") {
        onPlaybackStatusChange("buffering");
        return;
      }

      if (mode === "playing" || mode === "playing-muted") {
        onPlaybackStatusChange("playing");
        return;
      }

      if (mode === "ended") {
        onPlaybackStatusChange("ended");
        return;
      }

      if (mode === "error") {
        onPlaybackStatusChange("error");
        return;
      }

      onPlaybackStatusChange("loading");
      return;
    }

    const { mode, playerState } = options;
    const isBuffering =
      (mode === "playing" || mode === "playing-muted") &&
      playerState === PlayerState.BUFFERING;

    if (mode === "ended") {
      onPlaybackStatusChange("ended");
      return;
    }

    if (mode === "playing" || mode === "playing-muted") {
      onPlaybackStatusChange(isBuffering ? "buffering" : "playing");
      return;
    }

    if (playerState === PlayerState.READY || mode === "gate") {
      onPlaybackStatusChange("ready");
      return;
    }

    onPlaybackStatusChange("loading");
  }, [options]);
}
