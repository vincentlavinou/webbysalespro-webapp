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
  const [showReturnBanner, setShowReturnBanner] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBannerTimer = () => {
    if (bannerTimerRef.current) {
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = null;
    }
  };

  useEffect(() => {
    clearBannerTimer();

    if (!showReturnBanner) return;

    bannerTimerRef.current = setTimeout(() => {
      setShowReturnBanner(false);
      bannerTimerRef.current = null;
    }, 3000);

    return clearBannerTimer;
  }, [showReturnBanner]);

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
        if (hasPlayedRef.current) {
          setShowReturnBanner(true);
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

  return { showReturnBanner };
}
