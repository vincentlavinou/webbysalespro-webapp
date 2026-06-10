// components/ivs/WebbySalesProPlayer.tsx
"use client";

import React, { forwardRef, useState } from "react";
import type { PlaybackStatus } from "@/playback/context/PlaybackRuntimeContext";
import { detectDeviceType } from "./hooks/use-device-type";
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
    // Pin the device type synchronously at mount so the player selection always
    // agrees with PersistentChannelPlaybackProvider, which also commits the
    // device type synchronously. The deferred useDeviceType() hook returns
    // "desktop" on the first render, which on Android caused the Desktop player
    // to mount and call usePersistentChannelPlayback() while only the Android
    // context was provided — throwing "must be called within
    // PersistentChannelPlaybackProvider".
    const [deviceType] = useState(() => detectDeviceType());

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
