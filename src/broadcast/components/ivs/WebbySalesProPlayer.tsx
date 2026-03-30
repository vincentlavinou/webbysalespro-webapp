// components/ivs/WebbySalesProPlayer.tsx
"use client";

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
};

export default function WebbySalesProPlayer(props: Props) {
  const deviceType = useDeviceType();

  if (deviceType === "ios") return <IOSWebbySalesProPlayer {...props} />;
  if (deviceType === "android") return <AndroidWebbySalesProPlayer {...props} showStats />;
  return <DesktopWebbySalesProPlayer {...props} />;
}
