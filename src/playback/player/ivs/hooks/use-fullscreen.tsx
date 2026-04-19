// components/ivs/hooks/use-fullscreen.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Fullscreen mode ─────────────────────────────────────────────────────────
// Orthogonal to PlayerMode — you can be buffering AND in fullscreen.
// Tracked separately so shouldIgnoreVisibilityChange is always race-proof:
// we set "entering" BEFORE calling the API, so any visibilitychange that fires
// during or after the transition is suppressed regardless of event order.
export type FullscreenMode = "none" | "entering" | "active" | "exiting";

// Hold "exiting" for this long after fullscreen ends to absorb the trailing
// visibilitychange:visible that iOS fires after the transition animation.
const POST_EXIT_SUPPRESS_MS = 400;

type FullscreenCapableElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FullscreenCapableVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};
type FullscreenCapableDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
};

type Options = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Called when fullscreen exits and the video element is paused — caller should resume. */
  onResumeNeeded: () => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  syncWithOrientation?: boolean;
};

export function useFullscreen({
  videoRef,
  containerRef,
  onResumeNeeded,
  onFullscreenChange,
  syncWithOrientation = false,
}: Options) {
  const [fullscreenMode, setFullscreenModeState] = useState<FullscreenMode>("none");

  // Ref mirror kept in sync for use inside stable callbacks and shouldIgnoreVisibilityChange.
  const fullscreenModeRef = useRef<FullscreenMode>("none");
  const autoFullscreenRef = useRef(false);
  const postExitTimerRef = useRef<number | null>(null);

  // Keep onResumeNeeded stable without adding it to every effect dep array.
  const onResumeNeededRef = useRef(onResumeNeeded);
  useEffect(() => { onResumeNeededRef.current = onResumeNeeded; }, [onResumeNeeded]);
  const onFullscreenChangeRef = useRef(onFullscreenChange);
  useEffect(() => { onFullscreenChangeRef.current = onFullscreenChange; }, [onFullscreenChange]);

  const setFullscreenMode = useCallback((m: FullscreenMode) => {
    fullscreenModeRef.current = m;
    setFullscreenModeState(m);
  }, []);

  const clearPostExitTimer = useCallback(() => {
    if (postExitTimerRef.current) {
      window.clearTimeout(postExitTimerRef.current);
      postExitTimerRef.current = null;
    }
  }, []);

  const isInFullscreen = useCallback(() => {
    const doc = document as FullscreenCapableDocument;
    const video = videoRef.current as FullscreenCapableVideo | null;
    return Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      video?.webkitDisplayingFullscreen,
    );
  }, [videoRef]);

  const enterFullscreen = useCallback(async () => {
    const container = containerRef.current as FullscreenCapableElement | null;
    const video = videoRef.current as FullscreenCapableVideo | null;
    if (!container || !video || isInFullscreen()) return;

    // Set mode BEFORE the API call — race-proof suppression of visibilitychange.
    setFullscreenMode("entering");

    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
        autoFullscreenRef.current = true;
        return;
      }
      if (container.webkitRequestFullscreen) {
        await container.webkitRequestFullscreen();
        autoFullscreenRef.current = true;
        return;
      }
      if (video.webkitEnterFullscreen) {
        // Synchronous — fullscreenchange / webkitendfullscreen will update mode.
        video.webkitEnterFullscreen();
        autoFullscreenRef.current = true;
        return;
      }
      // No fullscreen API available.
      setFullscreenMode("none");
    } catch {
      setFullscreenMode("none");
    }
  }, [containerRef, videoRef, isInFullscreen, setFullscreenMode]);

  const exitFullscreen = useCallback(async () => {
    if (!isInFullscreen()) return;
    const doc = document as FullscreenCapableDocument;
    const video = videoRef.current as FullscreenCapableVideo | null;

    setFullscreenMode("exiting");

    try {
      if (doc.fullscreenElement) {
        await doc.exitFullscreen();
        return;
      }
      if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
        return;
      }
      if (video?.webkitDisplayingFullscreen) {
        // iOS Safari native video fullscreen — no safe programmatic exit.
        // webkitendfullscreen will fire when the user exits natively.
        return;
      }
      setFullscreenMode("none");
    } catch {
      setFullscreenMode("none");
    }
  }, [isInFullscreen, videoRef, setFullscreenMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const finalizeFullscreenExit = () => {
      autoFullscreenRef.current = false;
      clearPostExitTimer();
      setFullscreenMode("none");
      onFullscreenChangeRef.current?.(false);
    };

    const onFullscreenChange = () => {
      if (isInFullscreen()) {
        // Entered fullscreen — clear any post-exit timer and mark as active.
        clearPostExitTimer();
        setFullscreenMode("active");
        onFullscreenChangeRef.current?.(true);
        return;
      }

      // Exited fullscreen.
      autoFullscreenRef.current = false;
      setFullscreenMode("exiting"); // suppress visibilitychange while animating out

      // Fullscreen transitions can leave IVS in IDLE with a black frame even
      // when the media element is no longer paused, so always request a live
      // restore once the browser has finished unwinding the transition.
      window.setTimeout(() => {
        if (!isInFullscreen()) {
          onResumeNeededRef.current();
        }
      }, 150);

      // Hold "exiting" briefly to catch the trailing visibilitychange:visible
      // that iOS fires after the fullscreen animation completes.
      postExitTimerRef.current = window.setTimeout(() => {
        finalizeFullscreenExit();
      }, POST_EXIT_SUPPRESS_MS);
    };

    const reconcileFullscreenState = () => {
      if (document.visibilityState === "hidden") return;

      const actuallyFullscreen = isInFullscreen();
      const trackedMode = fullscreenModeRef.current;

      if (actuallyFullscreen) {
        if (trackedMode !== "active") {
          clearPostExitTimer();
          setFullscreenMode("active");
          onFullscreenChangeRef.current?.(true);
        }
        return;
      }

      if (trackedMode === "none") return;

      finalizeFullscreenExit();

      window.setTimeout(() => {
        if (!isInFullscreen()) {
          onResumeNeededRef.current();
        }
      }, 150);
    };

    const syncOrientationFullscreen = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape) {
        void enterFullscreen();
        return;
      }
      if (autoFullscreenRef.current || isInFullscreen()) {
        void exitFullscreen();
      }
    };

    const fullscreenVideo = videoRef.current;
    if (syncWithOrientation) {
      syncOrientationFullscreen();
      window.addEventListener("resize", syncOrientationFullscreen);
      window.screen.orientation?.addEventListener?.("change", syncOrientationFullscreen);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange as EventListener);
    document.addEventListener("visibilitychange", reconcileFullscreenState);
    window.addEventListener("pageshow", reconcileFullscreenState);
    window.addEventListener("focus", reconcileFullscreenState);
    // iOS native video fullscreen exit
    fullscreenVideo?.addEventListener("webkitendfullscreen", onFullscreenChange as EventListener);

    return () => {
      clearPostExitTimer();
      if (syncWithOrientation) {
        window.removeEventListener("resize", syncOrientationFullscreen);
        window.screen.orientation?.removeEventListener?.("change", syncOrientationFullscreen);
      }
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange as EventListener);
      document.removeEventListener("visibilitychange", reconcileFullscreenState);
      window.removeEventListener("pageshow", reconcileFullscreenState);
      window.removeEventListener("focus", reconcileFullscreenState);
      fullscreenVideo?.removeEventListener("webkitendfullscreen", onFullscreenChange as EventListener);
    };
  }, [
    clearPostExitTimer,
    isInFullscreen,
    enterFullscreen,
    exitFullscreen,
    syncWithOrientation,
    videoRef,
    setFullscreenMode,
  ]);

  return {
    enterFullscreen,
    exitFullscreen,
    fullscreenMode,
    isFullscreen: fullscreenMode === "active",
    /** Stable ref for use in shouldIgnoreVisibilityChange — avoids closure staleness. */
    fullscreenModeRef,
  };
}
