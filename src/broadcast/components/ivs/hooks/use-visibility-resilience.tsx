// components/ivs/hooks/use-visibility-resilience.ts
"use client";

import { useEffect } from "react";

type Options = {
  enabled: boolean;
  hasPlayedRef: React.RefObject<boolean>;
  isPiPRef?: React.RefObject<boolean>;
  enterPiP?: () => void;
  exitPiP?: () => void;
  restoreToLive: (options?: { forceReload?: boolean }) => Promise<void>;
  shouldIgnoreVisibilityChange?: () => boolean;
  // If provided, we’ll use audio fallback instead of PiP
  onHiddenAudio?: () => void;
  onVisibleAudio?: () => void;
};

export function useVisibilityResilience({
  enabled,
  hasPlayedRef,
  isPiPRef,
  enterPiP,
  exitPiP,
  restoreToLive,
  shouldIgnoreVisibilityChange,
  onHiddenAudio,
  onVisibleAudio,
}: Options) {
  useEffect(() => {
    if (!enabled) return;

    const onVis = () => {
      if (shouldIgnoreVisibilityChange?.()) return;

      if (document.visibilityState === "hidden") {
        // Prefer audio fallback (Option 1)
        if (hasPlayedRef.current && onHiddenAudio) {
          onHiddenAudio();
          return;
        }
        // else try PiP (optional)
        enterPiP?.();
        return;
      }

      if (document.visibilityState === "visible") {
        // If in PiP, exit to inline; otherwise restore live.
        if (isPiPRef?.current) {
          exitPiP?.();
          return;
        }

        if (onVisibleAudio) {
          onVisibleAudio();
          return;
        }

        void restoreToLive({ forceReload: true });
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [
    enabled,
    hasPlayedRef,
    isPiPRef,
    enterPiP,
    exitPiP,
    restoreToLive,
    shouldIgnoreVisibilityChange,
    onHiddenAudio,
    onVisibleAudio,
  ]);
}
