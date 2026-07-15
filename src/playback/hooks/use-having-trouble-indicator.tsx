"use client";

import { useEffect, useState } from "react";
import type { PlaybackStatus } from "@/playback/context/PlaybackRuntimeContext";

const SHOW_AFTER_MS = 3000;
const HIDE_AFTER_MS = 10000;

type PlaybackBucket = "playing" | "ended" | "stalled";

function toBucket(status: PlaybackStatus): PlaybackBucket {
  if (status === "playing") return "playing";
  if (status === "ended") return "ended";
  return "stalled";
}

// Debounces playback status into a single "having trouble?" flag: it flips on
// after playback has been stalled (buffering/loading/error/etc.) for
// SHOW_AFTER_MS, and flips off after playback has been continuously healthy
// for HIDE_AFTER_MS. Keyed on the bucket (not raw status) so flicker between
// e.g. "loading" and "buffering" doesn't restart the show timer.
export function useHavingTroubleIndicator(status: PlaybackStatus): boolean {
  const [isTroubled, setIsTroubled] = useState(false);
  const bucket = toBucket(status);

  useEffect(() => {
    if (bucket === "stalled") {
      const timer = setTimeout(() => setIsTroubled(true), SHOW_AFTER_MS);
      return () => clearTimeout(timer);
    }

    if (bucket === "playing") {
      const timer = setTimeout(() => setIsTroubled(false), HIDE_AFTER_MS);
      return () => clearTimeout(timer);
    }

    setIsTroubled(false);
  }, [bucket]);

  return isTroubled;
}
