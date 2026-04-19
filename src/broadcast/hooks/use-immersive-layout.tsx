"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ImmersiveLayoutState =
  | "regular"
  | "split"
  | "fullscreen-split"
  | "fullscreen-media";

const PORTRAIT_EXIT_DELAY_MS = 750;
const SPLIT_ENTER_PORTRAIT_GRACE_MS = 3000;

export function useImmersiveLayout() {
  const [forcedLayoutState, setForcedLayoutState] =
    useState<ImmersiveLayoutState | null>(null);
  const [splitEnteredInPortrait, setSplitEnteredInPortrait] = useState(false);
  const [splitSawLandscape, setSplitSawLandscape] = useState(false);
  const [mediaFullscreenEnteredInPortrait, setMediaFullscreenEnteredInPortrait] =
    useState(false);
  const [mediaFullscreenSawLandscape, setMediaFullscreenSawLandscape] =
    useState(false);
  const splitExitTimerRef = useRef<number | null>(null);
  const portraitExitTimerRef = useRef<number | null>(null);
  const fullscreenSplitExitTimerRef = useRef<number | null>(null);
  const previousLayoutStateRef = useRef<ImmersiveLayoutState>("regular");
  const lastNonFullscreenLayoutRef = useRef<"regular" | "split">("regular");

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

  const getResponsiveLayout = useCallback(
    (): "regular" | "split" => (isPhysicalLandscape ? "split" : "regular"),
    [isPhysicalLandscape],
  );

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

  const clearFullscreenSplitExitTimer = useCallback(() => {
    if (fullscreenSplitExitTimerRef.current) {
      window.clearTimeout(fullscreenSplitExitTimerRef.current);
      fullscreenSplitExitTimerRef.current = null;
    }
  }, []);

  const resetSplitTracking = useCallback(() => {
    setSplitEnteredInPortrait(false);
    setSplitSawLandscape(false);
  }, []);

  const resetMediaFullscreenTracking = useCallback(() => {
    setMediaFullscreenEnteredInPortrait(false);
    setMediaFullscreenSawLandscape(false);
  }, []);

  const applyNonFullscreenLayout = useCallback(
    (nextLayout: "regular" | "split") => {
      lastNonFullscreenLayoutRef.current = nextLayout;
      const responsiveLayout = getResponsiveLayout();
      setForcedLayoutState(nextLayout === responsiveLayout ? null : nextLayout);
    },
    [getResponsiveLayout],
  );

  const enterSplit = useCallback(() => {
    clearSplitExitTimer();
    clearPortraitExitTimer();
    clearFullscreenSplitExitTimer();
    setSplitEnteredInPortrait(!isPhysicalLandscape);
    setSplitSawLandscape(isPhysicalLandscape);
    resetMediaFullscreenTracking();
    applyNonFullscreenLayout("split");
  }, [
    applyNonFullscreenLayout,
    clearFullscreenSplitExitTimer,
    clearPortraitExitTimer,
    clearSplitExitTimer,
    isPhysicalLandscape,
    resetMediaFullscreenTracking,
  ]);

  const enterFullscreenSplit = useCallback(() => {
    clearSplitExitTimer();
    clearPortraitExitTimer();
    clearFullscreenSplitExitTimer();
    lastNonFullscreenLayoutRef.current =
      forcedLayoutState === "regular" || forcedLayoutState === "split"
        ? forcedLayoutState
        : getResponsiveLayout();
    resetMediaFullscreenTracking();
    setForcedLayoutState("fullscreen-split");
  }, [
    clearFullscreenSplitExitTimer,
    clearPortraitExitTimer,
    clearSplitExitTimer,
    forcedLayoutState,
    getResponsiveLayout,
    resetMediaFullscreenTracking,
  ]);

  const enterFullscreenMedia = useCallback(() => {
    clearSplitExitTimer();
    clearPortraitExitTimer();
    clearFullscreenSplitExitTimer();
    lastNonFullscreenLayoutRef.current =
      forcedLayoutState === "regular" || forcedLayoutState === "split"
        ? forcedLayoutState
        : getResponsiveLayout();
    resetSplitTracking();
    setMediaFullscreenEnteredInPortrait(!isPhysicalLandscape);
    setMediaFullscreenSawLandscape(isPhysicalLandscape);
    setForcedLayoutState("fullscreen-media");
  }, [
    clearFullscreenSplitExitTimer,
    clearPortraitExitTimer,
    clearSplitExitTimer,
    forcedLayoutState,
    getResponsiveLayout,
    isPhysicalLandscape,
    resetSplitTracking,
  ]);

  const exitFullscreen = useCallback(() => {
    clearSplitExitTimer();
    clearPortraitExitTimer();
    clearFullscreenSplitExitTimer();
    resetSplitTracking();
    resetMediaFullscreenTracking();
    applyNonFullscreenLayout(lastNonFullscreenLayoutRef.current);
  }, [
    applyNonFullscreenLayout,
    clearFullscreenSplitExitTimer,
    clearPortraitExitTimer,
    clearSplitExitTimer,
    resetMediaFullscreenTracking,
    resetSplitTracking,
  ]);

  const layoutState: ImmersiveLayoutState =
    forcedLayoutState ?? getResponsiveLayout();
  const isFullscreenSplit = layoutState === "fullscreen-split";
  const isFullscreenMedia = layoutState === "fullscreen-media";
  const isImmersive = isFullscreenMedia;
  const isFullscreen = isFullscreenSplit || isFullscreenMedia;

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
      applyNonFullscreenLayout("regular");
      resetSplitTracking();
    }, splitEnteredInPortrait && !splitSawLandscape
      ? SPLIT_ENTER_PORTRAIT_GRACE_MS
      : PORTRAIT_EXIT_DELAY_MS);

    return () => {
      clearSplitExitTimer();
    };
  }, [
    applyNonFullscreenLayout,
    clearSplitExitTimer,
    isPhysicalLandscape,
    layoutState,
    resetSplitTracking,
    splitEnteredInPortrait,
    splitSawLandscape,
  ]);

  useEffect(() => {
    if (!isFullscreenMedia) {
      clearPortraitExitTimer();
      return;
    }

    if (isPhysicalLandscape) {
      clearPortraitExitTimer();
      setMediaFullscreenSawLandscape(true);
      return;
    }

    portraitExitTimerRef.current = window.setTimeout(() => {
      portraitExitTimerRef.current = null;
      applyNonFullscreenLayout(lastNonFullscreenLayoutRef.current);
      resetMediaFullscreenTracking();
    }, PORTRAIT_EXIT_DELAY_MS);

    return () => {
      clearPortraitExitTimer();
    };
  }, [
    applyNonFullscreenLayout,
    clearPortraitExitTimer,
    isFullscreenMedia,
    isPhysicalLandscape,
    resetMediaFullscreenTracking,
  ]);

  useEffect(() => {
    if (!isFullscreenSplit) {
      clearFullscreenSplitExitTimer();
      return;
    }

    if (isPhysicalLandscape) {
      clearFullscreenSplitExitTimer();
      return;
    }

    fullscreenSplitExitTimerRef.current = window.setTimeout(() => {
      fullscreenSplitExitTimerRef.current = null;
      applyNonFullscreenLayout(lastNonFullscreenLayoutRef.current);
    }, PORTRAIT_EXIT_DELAY_MS);

    return () => {
      clearFullscreenSplitExitTimer();
    };
  }, [
    applyNonFullscreenLayout,
    clearFullscreenSplitExitTimer,
    isFullscreenSplit,
    isPhysicalLandscape,
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
      if (isPhysicalLandscape) {
        enterFullscreenSplit();
        return;
      }
      enterFullscreenMedia();
      return;
    }

    if (layoutState === "fullscreen-split") {
      enterFullscreenMedia();
      return;
    }

    exitFullscreen();
  }, [
    enterFullscreenMedia,
    enterFullscreenSplit,
    enterSplit,
    exitFullscreen,
    isPhysicalLandscape,
    layoutState,
  ]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
      return;
    }

    if (isPhysicalLandscape) {
      enterFullscreenSplit();
      return;
    }

    enterFullscreenMedia();
  }, [
    enterFullscreenMedia,
    enterFullscreenSplit,
    exitFullscreen,
    isFullscreen,
    isPhysicalLandscape,
  ]);

  const toggleFullscreenSurface = useCallback(() => {
    if (layoutState === "fullscreen-split") {
      enterFullscreenMedia();
      return;
    }

    if (layoutState === "fullscreen-media" && isPhysicalLandscape) {
      setMediaFullscreenSawLandscape(true);
      setForcedLayoutState("fullscreen-split");
      return;
    }

    if (layoutState === "split" && isPhysicalLandscape) {
      enterFullscreenSplit();
      return;
    }

    if (layoutState === "split" || layoutState === "regular") {
      enterFullscreenMedia();
    }
  }, [
    enterFullscreenMedia,
    enterFullscreenSplit,
    isPhysicalLandscape,
    layoutState,
  ]);

  return {
    advanceLayout,
    enterImmersive: enterFullscreenMedia,
    enterSplit,
    enterFullscreenSplit,
    enterFullscreenMedia,
    exitFullscreen,
    exitImmersive: exitFullscreen,
    isImmersive,
    isFullscreen,
    isFullscreenSplit,
    isFullscreenMedia,
    isPhysicalLandscape,
    layoutState,
    toggleFullscreen,
    toggleFullscreenSurface,
    shouldRotatePortraitImmersive:
      isFullscreenMedia &&
      mediaFullscreenEnteredInPortrait &&
      !isPhysicalLandscape &&
      !mediaFullscreenSawLandscape,
    shouldRotatePortraitSplit:
      layoutState === "split" &&
      splitEnteredInPortrait &&
      !isPhysicalLandscape &&
      !splitSawLandscape,
  };
}
