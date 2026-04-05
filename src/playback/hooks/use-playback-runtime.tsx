'use client';

import { useContext } from "react";
import { PlaybackRuntimeContext } from "../context/PlaybackRuntimeContext";

export function usePlaybackRuntime() {
  const ctx = useContext(PlaybackRuntimeContext);
  if (!ctx) {
    throw new Error(
      "usePlaybackRuntime is not being used inside PlaybackRuntimeProvider",
    );
  }
  return ctx;
}
