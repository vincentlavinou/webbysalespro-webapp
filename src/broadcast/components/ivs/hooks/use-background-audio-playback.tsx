// components/ivs/hooks/use-background-audio-playback.tsx
"use client";

import { useCallback, useRef, useState } from "react";

type Options = {
  enabled?: boolean;
  hlsUrl: string | null;
  /** called when we return to visible and should restore live video */
  onRestoreVideo?: () => Promise<void> | void;
};

export function useBackgroundAudioPlayback(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  { enabled = true, hlsUrl, onRestoreVideo }: Options
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
  const prime = useCallback(async () => {
    if (!enabled || !hlsUrl) return;
    const a = ensureAudio();
    if (a.src !== hlsUrl) a.src = hlsUrl;
    a.preload = "auto";

    // Warm the element inside the user's gesture so Safari is willing to let
    // us promote playback to this native audio path after the tab is hidden.
    const previousMuted = a.muted;
    try {
      a.muted = true;
      await a.play();
      a.pause();
      a.currentTime = 0;
    } catch {
      // Best-effort only. If priming is blocked, hidden playback may still fail.
    } finally {
      a.muted = previousMuted;
    }
  }, [enabled, hlsUrl, ensureAudio]);

  const toAudio = useCallback(async () => {
    if (!enabled || !hlsUrl) return;
    const video = videoRef.current;
    if (!video) return;

    const a = ensureAudio();
    if (a.src !== hlsUrl) a.src = hlsUrl;
    a.muted = false;

    // Best-effort sync
    const t = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    try {
      a.currentTime = t;
    } catch {}

    try {
      await a.play();
      setMode("audio");

      // Only pause the video element after the audio fallback is confirmed.
      try {
        video.pause();
      } catch {}
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

  return { mode, prime, toAudio, toVideo, getAudioEl: () => audioRef.current };
}
