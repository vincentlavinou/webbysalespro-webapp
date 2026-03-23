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
};

export function useVisibilityResilience({
  enabled,
  hasPlayedRef,
  isPiPRef,
  enterPiP,
  exitPiP,
  restoreToLive,
  shouldIgnoreVisibilityChange,
}: Options) {
  useEffect(() => {
    if (!enabled) return;

    const onVis = () => {
      if (shouldIgnoreVisibilityChange?.()) return;

      if (document.visibilityState === "hidden") {
        enterPiP?.();
        return;
      }

      if (document.visibilityState === "visible") {
        if (isPiPRef?.current) {
          exitPiP?.();
          return;
        }

        if (hasPlayedRef.current) {
          void restoreToLive({ forceReload: true });
        }
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
  ]);
}
