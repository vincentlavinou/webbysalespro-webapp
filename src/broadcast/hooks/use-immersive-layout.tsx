"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ImmersiveLayoutState = "regular" | "split" | "immersive";

type ViewportSize = {
  width: number;
  height: number;
};

const PORTRAIT_EXIT_DELAY_MS = 750;

export function useImmersiveLayout({ width, height }: ViewportSize) {
  const [forcedLayoutState, setForcedLayoutState] =
    useState<ImmersiveLayoutState | null>(null);
  const [immersiveEnteredInPortrait, setImmersiveEnteredInPortrait] =
    useState(false);
  const [immersiveSawLandscape, setImmersiveSawLandscape] = useState(false);
  const portraitExitTimerRef = useRef<number | null>(null);

  const isPhysicalLandscape = useMemo(() => {
    if (width <= 0 || height <= 0) return false;
    return width > height;
  }, [width, height]);

  const clearPortraitExitTimer = useCallback(() => {
    if (portraitExitTimerRef.current) {
      window.clearTimeout(portraitExitTimerRef.current);
      portraitExitTimerRef.current = null;
    }
  }, []);

  const resetImmersiveTracking = useCallback(() => {
    setImmersiveEnteredInPortrait(false);
    setImmersiveSawLandscape(false);
  }, []);

  const enterSplit = useCallback(() => {
    clearPortraitExitTimer();
    resetImmersiveTracking();
    setForcedLayoutState("split");
  }, [clearPortraitExitTimer, resetImmersiveTracking]);

  const enterImmersive = useCallback(() => {
    clearPortraitExitTimer();
    setImmersiveEnteredInPortrait(!isPhysicalLandscape);
    setImmersiveSawLandscape(isPhysicalLandscape);
    setForcedLayoutState("immersive");
  }, [clearPortraitExitTimer, isPhysicalLandscape]);

  const exitImmersive = useCallback(() => {
    clearPortraitExitTimer();
    resetImmersiveTracking();
    setForcedLayoutState(isPhysicalLandscape ? "split" : null);
  }, [clearPortraitExitTimer, isPhysicalLandscape, resetImmersiveTracking]);

  const layoutState: ImmersiveLayoutState =
    forcedLayoutState ?? (isPhysicalLandscape ? "split" : "regular");
  const isImmersive = layoutState === "immersive";

  useEffect(() => {
    if (!isImmersive) {
      clearPortraitExitTimer();
      return;
    }

    if (isPhysicalLandscape) {
      clearPortraitExitTimer();
      setImmersiveSawLandscape(true);
      return;
    }

    portraitExitTimerRef.current = window.setTimeout(() => {
      portraitExitTimerRef.current = null;
      setForcedLayoutState(null);
      resetImmersiveTracking();
    }, PORTRAIT_EXIT_DELAY_MS);

    return () => {
      clearPortraitExitTimer();
    };
  }, [
    clearPortraitExitTimer,
    isImmersive,
    isPhysicalLandscape,
    resetImmersiveTracking,
  ]);

  const advanceLayout = useCallback(() => {
    if (layoutState === "regular") {
      enterSplit();
      return;
    }

    if (layoutState === "split") {
      enterImmersive();
      return;
    }

    exitImmersive();
  }, [enterImmersive, enterSplit, exitImmersive, layoutState]);

  return {
    advanceLayout,
    enterImmersive,
    enterSplit,
    exitImmersive,
    isImmersive,
    isPhysicalLandscape,
    layoutState,
    shouldRotatePortraitImmersive:
      isImmersive &&
      immersiveEnteredInPortrait &&
      !isPhysicalLandscape &&
      !immersiveSawLandscape,
  };
}
