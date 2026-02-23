// components/ivs/hooks/use-background-audio-playback.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  enabled?: boolean;
  hlsUrl: string | null;
  /** for stats/UX: only show "audio was playing" after user has played once */
  hasPlayedRef?: React.RefObject<boolean>;
  /** called when we return to visible and should restore live video */
  onRestoreVideo?: () => Promise<void> | void;
};

export function useBackgroundAudioPlayback(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  { enabled = true, hlsUrl, hasPlayedRef, onRestoreVideo }: Options
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [mode, setMode] = useState<"video" | "audio">("video");

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = document.createElement("audio");
      a.preload = "auto";
      a.crossOrigin = "anonymous";
      audioRef.current = a;
    }
    return audioRef.current!;
  }, []);

  /**
   * Call inside a user-gesture path (Join/Play click) to make Safari more likely
   * to allow background audio later.
   */
  const prime = useCallback(() => {
    if (!enabled || !hlsUrl) return;
    const a = ensureAudio();
    a.src = hlsUrl;
  }, [enabled, hlsUrl, ensureAudio]);

  const toAudio = useCallback(async () => {
    if (!enabled || !hlsUrl) return;
    const video = videoRef.current;
    if (!video) return;

    const a = ensureAudio();
    if (a.src !== hlsUrl) a.src = hlsUrl;

    // Best-effort sync
    const t = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    try {
      a.currentTime = t;
    } catch {}

    // Pause video rendering (Safari tends to pause it anyway when hidden)
    try {
      video.pause();
    } catch {}

    try {
      await a.play();
      setMode("audio");
    } catch {
      // If Safari blocks, stay in video mode (it may still pause in background).
      setMode("video");
    }
  }, [enabled, hlsUrl, ensureAudio, videoRef]);

  const toVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    // Stop audio
    const a = audioRef.current;
    let t = 0;
    if (a && Number.isFinite(a.currentTime)) t = a.currentTime;
    if (a) {
      try {
        a.pause();
      } catch {}
    }

    setMode("video");

    // Ask parent to restore video (usually reload to live edge)
    await onRestoreVideo?.();

    // Optional: try to nudge time close to where audio was.
    // For live, your restoreToLive() reload is typically better than seeking.
    try {
      if (t > 0 && Number.isFinite(video.currentTime)) {
        // do nothing by default; restoreToLive handles live edge
      }
    } catch {}
  }, [videoRef, onRestoreVideo]);

  useEffect(() => {
    if (!enabled) return;

    const onVis = () => {
      if (document.visibilityState === "hidden") {
        // Only attempt audio if playback has started at least once
        if (hasPlayedRef?.current) void toAudio();
      } else if (document.visibilityState === "visible") {
        void toVideo();
      }
    };

    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [enabled, toAudio, toVideo, hasPlayedRef]);

  return { mode, prime, toAudio, toVideo, getAudioEl: () => audioRef.current };
}