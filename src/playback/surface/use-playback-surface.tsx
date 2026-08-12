"use client";

import { useContext } from "react";
import { PlaybackSurfaceContext } from "./PlaybackSurfaceContext";

export function usePlaybackSurface() {
  const ctx = useContext(PlaybackSurfaceContext);
  if (!ctx) {
    throw new Error(
      "usePlaybackSurface must be called within a realtime playback provider",
    );
  }
  return ctx;
}
