"use client";

import { useContext } from "react";
import { PersistentStagePlaybackContext } from "./PersistentStagePlaybackContext";

export function usePersistentStagePlayback() {
  const ctx = useContext(PersistentStagePlaybackContext);
  if (!ctx) {
    throw new Error(
      "usePersistentStagePlayback must be called within PersistentStagePlaybackProvider",
    );
  }
  return ctx;
}
