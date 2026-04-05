'use client';

import { useContext } from "react";
import { PlaybackUserContext } from "../context/PlaybackUserContext";

export function usePlaybackUser() {
  const ctx = useContext(PlaybackUserContext);
  if (!ctx) {
    throw new Error("usePlaybackUser is not being used inside PlaybackUserProvider");
  }
  return ctx;
}
