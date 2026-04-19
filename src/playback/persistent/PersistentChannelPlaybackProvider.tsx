"use client";

import { useCallback, useRef, useState } from "react";
import {
  emitPlaybackEnded,
  emitPlaybackMetadata,
  emitPlaybackPlaying,
} from "@/emitter/playback";
import { detectDeviceType } from "../player/ivs/hooks/use-device-type";
import { PersistentAndroidPlaybackProvider } from "./PersistentAndroidPlaybackProvider";
import { useIvsPlayerCore } from "../player/ivs/hooks/use-ivs-player-core";
import { useLatencyWatchdog } from "../player/ivs/hooks/use-latency-watchdog";
import { useMediaSession } from "../player/ivs/hooks/use-media-session";
import { useVisibilityResilience } from "../player/ivs/hooks/use-visibility-resilience";
import { PersistentChannelPlaybackContext } from "./PersistentChannelPlaybackContext";

type Props = {
  src: string;
  title?: string;
  artwork?: MediaImage[];
  children: React.ReactNode;
};

// Inner component owns all hooks — separated so the outer shell can do an
// early-return for Android without violating the rules of hooks.
function IvsPersistentCore({ src, title, artwork, children }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenHostRef = useRef<HTMLDivElement>(null);

  // Determine autoPlay once at mount using the synchronous device check so it
  // never changes and never triggers a player re-init.
  const [autoPlay] = useState(() => detectDeviceType() !== "ios");

  const shouldPreventPause = useCallback(() => true, []);

  const ivs = useIvsPlayerCore({
    src,
    autoPlay,
    videoRef,
    onTextMetadata: emitPlaybackMetadata,
    onEnded: emitPlaybackEnded,
    onPlaying: emitPlaybackPlaying,
    keepAlive: true,
    shouldPreventPause,
  });

  useLatencyWatchdog(ivs.playerRef, src, ivs.playerVersion);

  useVisibilityResilience({
    enabled: true,
    videoRef,
    hasPlayedRef: ivs.hasPlayedRef,
    restoreToLive: ivs.restoreToLive,
  });

  useMediaSession({
    active: ivs.mode === "playing" || ivs.mode === "playing-muted",
    title,
    ariaLabel: "Live Webinar",
    artwork,
    onPlay: () => {
      videoRef.current?.play().catch(() => {});
    },
    onPause: () => {
      // Live stream must not stay paused — treat media-session pause as a resume request.
      videoRef.current?.play().catch(() => {});
    },
  });

  return (
    <PersistentChannelPlaybackContext.Provider
      value={{
        videoRef,
        hiddenHostRef,
        ...ivs,
      }}
    >
      {/*
        Always-mounted hidden host.
        The <video> lives here when no player view is in the DOM so audio
        continues through layout switches, route changes, and backgrounding.
      */}
      <div
        ref={hiddenHostRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          width: 0,
          height: 0,
          overflow: "hidden",
          opacity: 0,
          pointerEvents: "none",
          zIndex: -9999,
        }}
      >
        <video
          ref={videoRef}
          playsInline
          preload="auto"
          style={{ width: 0, height: 0 }}
        />
      </div>
      {children}
    </PersistentChannelPlaybackContext.Provider>
  );
}

export function PersistentChannelPlaybackProvider({
  src,
  title,
  artwork,
  children,
}: Props) {
  // Android uses its own player (useAndroidIvsPlayerCore) — exclude it from
  // the persistent IVS layer to avoid running two simultaneous player instances.
  const [isAndroid] = useState(() => detectDeviceType() === "android");

  if (isAndroid) {
    return (
      <PersistentAndroidPlaybackProvider src={src} title={title} artwork={artwork}>
        {children}
      </PersistentAndroidPlaybackProvider>
    );
  }

  return (
    <IvsPersistentCore src={src} title={title} artwork={artwork}>
      {children}
    </IvsPersistentCore>
  );
}
