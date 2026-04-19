"use client";

import { useContext } from "react";
import { PersistentChannelPlaybackContext } from "./PersistentChannelPlaybackContext";

export function usePersistentChannelPlayback() {
  const ctx = useContext(PersistentChannelPlaybackContext);
  if (!ctx) {
    throw new Error(
      "usePersistentChannelPlayback must be called within PersistentChannelPlaybackProvider",
    );
  }
  return ctx;
}
