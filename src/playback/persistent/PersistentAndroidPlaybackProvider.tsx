"use client";

import { useEffect, useRef } from "react";
import {
  emitPlaybackEnded,
  emitPlaybackMetadata,
  emitPlaybackPlaying,
} from "@/emitter/playback";
import { useAndroidIvsPlayerCore } from "../player/ivs/hooks/use-android-ivs-player-core";
import { useMediaSession } from "../player/ivs/hooks/use-media-session";
import { useVisibilityResilience } from "../player/ivs/hooks/use-visibility-resilience";
import { PersistentAndroidPlaybackContext } from "./PersistentAndroidPlaybackContext";

type Props = {
  src: string;
  title?: string;
  artwork?: MediaImage[];
  children: React.ReactNode;
};

export function PersistentAndroidPlaybackProvider({
  src,
  title,
  artwork,
  children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hiddenHostRef = useRef<HTMLDivElement>(null);
  const hasPlayedRef = useRef(false);

  const android = useAndroidIvsPlayerCore({
    src,
    videoRef,
    onTextMetadata: emitPlaybackMetadata,
    onEnded: emitPlaybackEnded,
    onPlaying: emitPlaybackPlaying,
  });

  // Track whether playback has ever started so useVisibilityResilience can
  // decide whether to call restoreToLive on tab-focus.
  useEffect(() => {
    if (android.mode === "playing" || android.mode === "playing-muted") {
      hasPlayedRef.current = true;
    }
  }, [android.mode]);

  // Prevent the browser from keeping the stream paused when backgrounded.
  // If the browser pauses the video element (OS audio interruption, tab
  // suspension, etc.) immediately resume as long as we have active playback.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPause = () => {
      if (!hasPlayedRef.current) return;
      video.play().catch(() => {});
    };

    video.addEventListener("pause", onPause);
    return () => video.removeEventListener("pause", onPause);
  }, []);

  useVisibilityResilience({
    enabled: true,
    videoRef,
    hasPlayedRef,
    restoreToLive: android.restoreToLive,
  });

  useMediaSession({
    active: android.mode === "playing" || android.mode === "playing-muted",
    title,
    ariaLabel: "Live Webinar",
    artwork,
    onPlay: () => {
      videoRef.current?.play().catch(() => {});
    },
    onPause: () => {
      // Live stream must not stay paused.
      videoRef.current?.play().catch(() => {});
    },
  });

  return (
    <PersistentAndroidPlaybackContext.Provider
      value={{
        videoRef,
        hiddenHostRef,
        ...android,
      }}
    >
      {/*
        Always-mounted hidden host — keeps audio alive when the player view
        unmounts during layout switches or navigation.
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
    </PersistentAndroidPlaybackContext.Provider>
  );
}
