// components/ivs/hooks/use-device-type.tsx
"use client";

import { useEffect, useState } from "react";

export type DeviceType = "ios" | "android" | "desktop";

export function detectDeviceType(): DeviceType {
  if (typeof navigator === "undefined") return "desktop";

  const nav = navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean;
      platform?: string;
    };
  };
  const ua = navigator.userAgent ?? "";
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";

  if (/Android/i.test(ua) || /Android/i.test(platform)) {
    return "android";
  }

  const isAppleMobileDevice = /iP(hone|ad|od)/.test(ua);
  const isIPadDesktopUA = platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (isAppleMobileDevice || isIPadDesktopUA) {
    return "ios";
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
