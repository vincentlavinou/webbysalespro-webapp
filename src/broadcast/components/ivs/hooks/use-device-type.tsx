// components/ivs/hooks/use-device-type.tsx
"use client";

import { useEffect, useState } from "react";

export type DeviceType = "ios" | "android" | "desktop";

function detectDeviceType(): DeviceType {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (
    /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/Android/i.test(ua)) {
    return "android";
  }
  return "desktop";
}

// Returns "desktop" on first render to avoid SSR/hydration mismatch,
// then updates to the real device type after mount.
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");

  useEffect(() => {
    setDeviceType(detectDeviceType());
  }, []);

  return deviceType;
}
