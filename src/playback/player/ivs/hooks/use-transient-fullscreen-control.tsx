"use client";

import { useEffect, useRef, useState } from "react";

type UseTransientFullscreenControlOptions = {
  enabled: boolean;
  hideDelayMs?: number;
};

export function useTransientFullscreenControl({
  enabled,
  hideDelayMs = 2200,
}: UseTransientFullscreenControlOptions) {
  const hideTimerRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const clearHideTimer = () => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  };

  const hideControls = () => {
    clearHideTimer();
    setIsVisible(false);
  };

  const showControls = () => {
    if (!enabled) return;
    clearHideTimer();
    setIsVisible(true);
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setIsVisible(false);
    }, hideDelayMs);
  };

  const toggleControls = () => {
    if (!enabled) return;

    setIsVisible((current) => {
      const nextVisible = !current;
      clearHideTimer();

      if (nextVisible) {
        hideTimerRef.current = window.setTimeout(() => {
          hideTimerRef.current = null;
          setIsVisible(false);
        }, hideDelayMs);
      }

      return nextVisible;
    });
  };

  useEffect(() => {
    if (!enabled) {
      clearHideTimer();
      setIsVisible(false);
    }
  }, [enabled]);

  useEffect(() => () => {
    if (hideTimerRef.current === null) return;
    window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = null;
  }, []);

  return {
    isVisible,
    hideControls,
    showControls,
    toggleControls,
  };
}
