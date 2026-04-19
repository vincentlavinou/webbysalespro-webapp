"use client";

import { useContext } from "react";
import { PersistentAndroidPlaybackContext } from "./PersistentAndroidPlaybackContext";

export function usePersistentAndroidPlayback() {
  const ctx = useContext(PersistentAndroidPlaybackContext);
  if (!ctx) {
    throw new Error(
      "usePersistentAndroidPlayback must be called within PersistentAndroidPlaybackProvider",
    );
  }
  return ctx;
}
