// components/ivs/hooks/use-visibility-resilience.ts
"use client";

import { useEffect, useRef } from "react";

type FullscreenAwareDocument = Document & {
  webkitFullscreenElement?: Element | null;
};

type FullscreenAwareVideo = HTMLVideoElement & {
  webkitDisplayingFullscreen?: boolean;
};

const FULLSCREEN_VISIBILITY_SUPPRESS_MS = 700;

type Options = {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasPlayedRef: React.RefObject<boolean>;
  isPiPRef?: React.RefObject<boolean>;
  enterPiP?: () => void;
  exitPiP?: () => void;
  restoreToLive: (options?: { forceReload?: boolean }) => Promise<void>;
  shouldIgnoreVisibilityChange?: () => boolean;
};

export function useVisibilityResilience({
  enabled,
  videoRef,
  hasPlayedRef,
  isPiPRef,
  enterPiP,
  exitPiP,
  restoreToLive,
  shouldIgnoreVisibilityChange,
}: Options) {
  const suppressVisibilityUntilRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const video = videoRef.current as FullscreenAwareVideo | null;
    const doc = document as FullscreenAwareDocument;

    const markFullscreenTransition = () => {
      suppressVisibilityUntilRef.current =
        Date.now() + FULLSCREEN_VISIBILITY_SUPPRESS_MS;
    };

    const isFullscreenTransitionActive = () => {
      const fullscreenVideo = video;
      return Boolean(
        Date.now() < suppressVisibilityUntilRef.current ||
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        fullscreenVideo?.webkitDisplayingFullscreen,
      );
    };

    const onVis = () => {
      if (isFullscreenTransitionActive()) return;
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
          void restoreToLive();
        }
      }
    };

    document.addEventListener("fullscreenchange", markFullscreenTransition);
    document.addEventListener(
      "webkitfullscreenchange",
      markFullscreenTransition as EventListener,
    );
    video?.addEventListener(
      "webkitbeginfullscreen",
      markFullscreenTransition as EventListener,
    );
    video?.addEventListener(
      "webkitendfullscreen",
      markFullscreenTransition as EventListener,
    );
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("fullscreenchange", markFullscreenTransition);
      document.removeEventListener(
        "webkitfullscreenchange",
        markFullscreenTransition as EventListener,
      );
      video?.removeEventListener(
        "webkitbeginfullscreen",
        markFullscreenTransition as EventListener,
      );
      video?.removeEventListener(
        "webkitendfullscreen",
        markFullscreenTransition as EventListener,
      );
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [
    enabled,
    videoRef,
    hasPlayedRef,
    isPiPRef,
    enterPiP,
    exitPiP,
    restoreToLive,
    shouldIgnoreVisibilityChange,
  ]);
}
