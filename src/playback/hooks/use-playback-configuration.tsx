'use client';

import { useContext } from "react";
import { PlaybackConfigurationContext } from "../context/PlaybackConfigurationContext";

export function usePlaybackConfiguration() {
  const ctx = useContext(PlaybackConfigurationContext);
  if (!ctx) {
    throw new Error(
      "usePlaybackConfiguration is not being used inside PlaybackConfigurationProvider",
    );
  }
  return ctx;
}
