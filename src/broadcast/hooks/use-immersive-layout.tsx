"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ImmersiveLayoutState = "regular" | "split" | "immersive";

type ViewportSize = {
  width: number;
  height: number;
};

const PORTRAIT_EXIT_DELAY_MS = 2000;

export function useImmersiveLayout({ width, height }: ViewportSize) {
  const [isImmersive, setIsImmersive] = useState(false);
  const [immersiveEnteredInPortrait, setImmersiveEnteredInPortrait] = useState(false);
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

  const enterImmersive = useCallback(() => {
    clearPortraitExitTimer();
    setImmersiveEnteredInPortrait(!isPhysicalLandscape);
    setImmersiveSawLandscape(isPhysicalLandscape);
    setIsImmersive(true);
  }, [clearPortraitExitTimer, isPhysicalLandscape]);

  const exitImmersive = useCallback(() => {
    clearPortraitExitTimer();
    setImmersiveEnteredInPortrait(false);
    setImmersiveSawLandscape(false);
    setIsImmersive(false);
  }, [clearPortraitExitTimer]);

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
      setIsImmersive(false);
    }, PORTRAIT_EXIT_DELAY_MS);

    return () => {
      clearPortraitExitTimer();
    };
  }, [clearPortraitExitTimer, isImmersive, isPhysicalLandscape]);

  const layoutState: ImmersiveLayoutState = isImmersive
    ? "immersive"
    : isPhysicalLandscape
      ? "split"
      : "regular";

  return {
    enterImmersive,
    exitImmersive,
    isImmersive,
    isPhysicalLandscape,
    shouldRotatePortraitImmersive:
      isImmersive &&
      immersiveEnteredInPortrait &&
      !isPhysicalLandscape &&
      !immersiveSawLandscape,
    layoutState,
  };
}
