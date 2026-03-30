"use client";

import { useEffect, useState } from "react";

export type AttendeeLayoutMode = "mobile" | "desktop-compact" | "desktop";

const DESKTOP_COMPACT_BREAKPOINT = 1024;
const TOUCH_MOBILE_BREAKPOINT = 1024;

function isTouchDevice() {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

function getAttendeeLayoutMode(): AttendeeLayoutMode {
  if (typeof window === "undefined") return "desktop";

  if (isTouchDevice() && window.innerWidth < TOUCH_MOBILE_BREAKPOINT) {
    return "mobile";
  }

  return window.innerWidth < DESKTOP_COMPACT_BREAKPOINT ? "desktop-compact" : "desktop";
}

export function useAttendeeLayoutMode() {
  const [layoutMode, setLayoutMode] = useState<AttendeeLayoutMode>(getAttendeeLayoutMode);

  useEffect(() => {
    const updateLayoutMode = () => {
      setLayoutMode(getAttendeeLayoutMode());
    };

    updateLayoutMode();
    window.addEventListener("resize", updateLayoutMode);

    return () => {
      window.removeEventListener("resize", updateLayoutMode);
    };
  }, []);

  return layoutMode;
}
