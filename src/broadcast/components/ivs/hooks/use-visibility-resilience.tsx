// components/ivs/hooks/use-visibility-resilience.ts
"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  enabled: boolean;
  hasPlayedRef: React.RefObject<boolean>;
  isPiPRef?: React.RefObject<boolean>;
  enterPiP?: () => void;
  exitPiP?: () => void;
  restoreToLive: () => Promise<void>;
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
  onHiddenAudio,
  onVisibleAudio,
}: Options) {
  const [showReturnBanner, setShowReturnBanner] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBannerTimer = () => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const onVis = () => {
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
        if (hasPlayedRef.current) {
          setShowReturnBanner(true);
          clearBannerTimer();
          bannerTimerRef.current = setTimeout(() => setShowReturnBanner(false), 4000);
        }

        // If in PiP, exit to inline; otherwise restore live.
        if (isPiPRef?.current) {
          exitPiP?.();
          return;
        }

        if (onVisibleAudio) {
          onVisibleAudio();
          return;
        }

        void restoreToLive();
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearBannerTimer();
    };
  }, [enabled, hasPlayedRef, isPiPRef, enterPiP, exitPiP, restoreToLive, onHiddenAudio, onVisibleAudio]);

  return { showReturnBanner };
}