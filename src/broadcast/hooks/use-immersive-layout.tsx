"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ImmersiveLayoutState = "regular" | "split";

const PORTRAIT_EXIT_DELAY_MS = 750;
const SPLIT_ENTER_PORTRAIT_GRACE_MS = 3000;

export function useImmersiveLayout() {
  const [forcedLayoutState, setForcedLayoutState] =
    useState<ImmersiveLayoutState | null>(null);
  const [splitEnteredInPortrait, setSplitEnteredInPortrait] = useState(false);
  const [splitSawLandscape, setSplitSawLandscape] = useState(false);
  const splitExitTimerRef = useRef<number | null>(null);
  const previousLayoutStateRef = useRef<ImmersiveLayoutState>("regular");

  const [isPhysicalLandscape, setIsPhysicalLandscape] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(orientation: landscape)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(orientation: landscape)");
    const handler = (e: MediaQueryListEvent) => setIsPhysicalLandscape(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const clearSplitExitTimer = useCallback(() => {
    if (splitExitTimerRef.current) {
      window.clearTimeout(splitExitTimerRef.current);
      splitExitTimerRef.current = null;
    }
  }, []);

  const resetSplitTracking = useCallback(() => {
    setSplitEnteredInPortrait(false);
    setSplitSawLandscape(false);
  }, []);

  const enterSplit = useCallback(() => {
    clearSplitExitTimer();
    setSplitEnteredInPortrait(!isPhysicalLandscape);
    setSplitSawLandscape(isPhysicalLandscape);
    setForcedLayoutState("split");
  }, [clearSplitExitTimer, isPhysicalLandscape]);

  const layoutState: ImmersiveLayoutState =
    forcedLayoutState ?? (isPhysicalLandscape ? "split" : "regular");

  useEffect(() => {
    if (
      forcedLayoutState === null &&
      !isPhysicalLandscape &&
      previousLayoutStateRef.current === "split" &&
      splitEnteredInPortrait
    ) {
      setSplitEnteredInPortrait(false);
      setSplitSawLandscape(true);
      setForcedLayoutState("split");
    }
  }, [forcedLayoutState, isPhysicalLandscape, splitEnteredInPortrait]);

  useEffect(() => {
    if (layoutState !== "split") {
      clearSplitExitTimer();
      return;
    }

    if (isPhysicalLandscape) {
      clearSplitExitTimer();
      setSplitSawLandscape(true);
      return;
    }

    splitExitTimerRef.current = window.setTimeout(() => {
      splitExitTimerRef.current = null;
      setForcedLayoutState(null);
      resetSplitTracking();
    }, splitEnteredInPortrait && !splitSawLandscape
      ? SPLIT_ENTER_PORTRAIT_GRACE_MS
      : PORTRAIT_EXIT_DELAY_MS);

    return () => {
      clearSplitExitTimer();
    };
  }, [
    clearSplitExitTimer,
    isPhysicalLandscape,
    layoutState,
    resetSplitTracking,
    splitEnteredInPortrait,
    splitSawLandscape,
  ]);

  useEffect(() => {
    previousLayoutStateRef.current = layoutState;
  }, [layoutState]);

  return {
    enterSplit,
    isPhysicalLandscape,
    layoutState,
    shouldRotatePortraitSplit:
      layoutState === "split" &&
      splitEnteredInPortrait &&
      !isPhysicalLandscape &&
      !splitSawLandscape,
  };
}
