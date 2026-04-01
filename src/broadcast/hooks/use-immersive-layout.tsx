"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ImmersiveLayoutState = "regular" | "split" | "immersive";

const PORTRAIT_EXIT_DELAY_MS = 750;
const SPLIT_ENTER_PORTRAIT_GRACE_MS = 3000;

export function useImmersiveLayout() {
  const [forcedLayoutState, setForcedLayoutState] =
    useState<ImmersiveLayoutState | null>(null);
  const [splitEnteredInPortrait, setSplitEnteredInPortrait] = useState(false);
  const [splitSawLandscape, setSplitSawLandscape] = useState(false);
  const [immersiveEnteredInPortrait, setImmersiveEnteredInPortrait] =
    useState(false);
  const [immersiveSawLandscape, setImmersiveSawLandscape] = useState(false);
  const splitExitTimerRef = useRef<number | null>(null);
  const portraitExitTimerRef = useRef<number | null>(null);
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

  const clearPortraitExitTimer = useCallback(() => {
    if (portraitExitTimerRef.current) {
      window.clearTimeout(portraitExitTimerRef.current);
      portraitExitTimerRef.current = null;
    }
  }, []);

  const resetSplitTracking = useCallback(() => {
    setSplitEnteredInPortrait(false);
    setSplitSawLandscape(false);
  }, []);

  const resetImmersiveTracking = useCallback(() => {
    setImmersiveEnteredInPortrait(false);
    setImmersiveSawLandscape(false);
  }, []);

  const enterSplit = useCallback(() => {
    clearSplitExitTimer();
    clearPortraitExitTimer();
    setSplitEnteredInPortrait(!isPhysicalLandscape);
    setSplitSawLandscape(isPhysicalLandscape);
    resetImmersiveTracking();
    setForcedLayoutState("split");
  }, [
    clearPortraitExitTimer,
    clearSplitExitTimer,
    isPhysicalLandscape,
    resetImmersiveTracking,
  ]);

  const enterImmersive = useCallback(() => {
    clearSplitExitTimer();
    clearPortraitExitTimer();
    resetSplitTracking();
    setImmersiveEnteredInPortrait(!isPhysicalLandscape);
    setImmersiveSawLandscape(isPhysicalLandscape);
    setForcedLayoutState("immersive");
  }, [
    clearPortraitExitTimer,
    clearSplitExitTimer,
    isPhysicalLandscape,
    resetSplitTracking,
  ]);

  const exitImmersive = useCallback(() => {
    clearSplitExitTimer();
    clearPortraitExitTimer();
    resetSplitTracking();
    resetImmersiveTracking();
    setForcedLayoutState(isPhysicalLandscape ? "split" : null);
  }, [
    clearPortraitExitTimer,
    clearSplitExitTimer,
    isPhysicalLandscape,
    resetImmersiveTracking,
    resetSplitTracking,
  ]);

  const layoutState: ImmersiveLayoutState =
    forcedLayoutState ?? (isPhysicalLandscape ? "split" : "regular");
  const isImmersive = layoutState === "immersive";

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

  useEffect(() => {
    previousLayoutStateRef.current = layoutState;
  }, [layoutState]);

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
    shouldRotatePortraitSplit:
      layoutState === "split" &&
      splitEnteredInPortrait &&
      !isPhysicalLandscape &&
      !splitSawLandscape,
  };
}
