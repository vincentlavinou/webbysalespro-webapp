"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ImmersiveLayoutState = "regular" | "split";

export function useImmersiveLayout() {
  const [forcedLayoutState, setForcedLayoutState] =
    useState<ImmersiveLayoutState | null>(null);
  const [splitEnteredInPortrait, setSplitEnteredInPortrait] = useState(false);
  const [splitSawLandscape, setSplitSawLandscape] = useState(false);
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

  const resetSplitTracking = useCallback(() => {
    setSplitEnteredInPortrait(false);
    setSplitSawLandscape(false);
  }, []);

  const enterSplit = useCallback(() => {
    setSplitEnteredInPortrait(!isPhysicalLandscape);
    setSplitSawLandscape(isPhysicalLandscape);
    setForcedLayoutState("split");
  }, [isPhysicalLandscape]);

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
      return;
    }

    if (isPhysicalLandscape) {
      setSplitSawLandscape(true);
      return;
    }

    setForcedLayoutState(null);
    resetSplitTracking();
  }, [
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
