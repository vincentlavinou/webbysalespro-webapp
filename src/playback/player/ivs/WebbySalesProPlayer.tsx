// components/ivs/WebbySalesProPlayer.tsx
"use client";

import React, { forwardRef } from "react";
import type { PlaybackStatus } from "@/playback/context/PlaybackRuntimeContext";
import { useDeviceType } from "./hooks/use-device-type";
import IOSWebbySalesProPlayer from "./IOSWebbySalesProPlayer";
import AndroidWebbySalesProPlayer from "./AndroidWebbySalesProPlayer";
import DesktopWebbySalesProPlayer from "./DesktopWebbySalesProPlayer";

type Props = {
  src: string;
  poster?: string;
  showStats?: boolean;
  ariaLabel?: string;
  title?: string;
  artwork?: MediaImage[];
  keepAlive?: boolean;
  onPlaybackStatusChange?: (status: PlaybackStatus) => void;
};

export type WebbySalesProPlayerHandle = {
  restoreToLive: (options?: {
    forceReload?: boolean;
    gracePeriodMs?: number;
  }) => Promise<void>;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
};

const WebbySalesProPlayer = forwardRef<WebbySalesProPlayerHandle, Props>(
  function WebbySalesProPlayer(props, ref) {
    const deviceType = useDeviceType();

    if (deviceType === "ios") {
      return <IOSWebbySalesProPlayer ref={ref} {...props} />;
    }
    if (deviceType === "android") {
      return <AndroidWebbySalesProPlayer ref={ref} {...props} />;
    }
    return <DesktopWebbySalesProPlayer ref={ref} {...props} />;
  },
);

export default WebbySalesProPlayer;
