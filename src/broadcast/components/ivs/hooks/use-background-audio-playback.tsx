// components/ivs/hooks/use-background-audio-playback.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LIVE_EDGE_SAFETY_GAP_SEC = 0.5;

const LIVE_EDGE_DRIFT_TOLERANCE_SEC = 1.5;
const LIVE_EDGE_CATCHUP_RATE = 1.03;
const LIVE_EDGE_SYNC_INTERVAL_MS = 3000;

type Options = {
  enabled?: boolean;
  hlsUrl: string | null;
  /** called when we return to visible and should restore live video */
  onRestoreVideo?: (options?: { forceReload?: boolean }) => Promise<void> | void;
  /**
   * Optional ref owned by the caller that the hook keeps in sync synchronously
   * on every mode change. Lets sibling hooks (e.g. use-player's shouldPreventPause)
   * read the current mode without a React re-render cycle.
   */
  externalModeRef?: React.MutableRefObject<"video" | "audio">;
};

export function useBackgroundAudioPlayback(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  { enabled = true, hlsUrl, onRestoreVideo, externalModeRef }: Options
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const modeRef = useRef<"video" | "audio">("video");
  const [mode, setMode] = useState<"video" | "audio">("video");

  const setModeBoth = useCallback((next: "video" | "audio") => {
    modeRef.current = next;
    if (externalModeRef) externalModeRef.current = next;
    setMode(next);
  }, [externalModeRef]);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = document.createElement("audio");
      a.preload = "auto";
      a.crossOrigin = "anonymous";
      audioRef.current = a;
    }
    return audioRef.current!;
  }, []);

  const keepAudioNearLive = useCallback((audio: HTMLAudioElement) => {
    const ranges = audio.seekable;
    if (ranges.length === 0) return;

    const liveEdge = ranges.end(ranges.length - 1);
    const target = Math.max(0, liveEdge - LIVE_EDGE_SAFETY_GAP_SEC);
    const drift = target - audio.currentTime;

    if (!Number.isFinite(drift)) return;

    // Small drift: gently speed up instead of seeking.
    if (drift > 0.35 && drift <= LIVE_EDGE_DRIFT_TOLERANCE_SEC) {
      audio.playbackRate = LIVE_EDGE_CATCHUP_RATE;
      return;
    }

    audio.playbackRate = 1;

    if (drift > LIVE_EDGE_DRIFT_TOLERANCE_SEC || drift < -0.35) {
      try {
        audio.currentTime = target;
      } catch {}
    }
  }, []);

  const seekAudioNearLive = useCallback((
    audio: HTMLAudioElement,
    fallbackTime?: number
  ) => {
    const ranges = audio.seekable;
    if (ranges.length > 0) {
      const liveEdge = ranges.end(ranges.length - 1);
      const target = Math.max(0, liveEdge - LIVE_EDGE_SAFETY_GAP_SEC);
      try {
        audio.currentTime = target;
        return;
      } catch {}
    }

    if (typeof fallbackTime === "number" && Number.isFinite(fallbackTime) && fallbackTime > 0) {
      try {
        audio.currentTime = fallbackTime;
      } catch {}
    }
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

    const fallbackTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    seekAudioNearLive(a, fallbackTime);

    try {
      await a.play();
      seekAudioNearLive(a, fallbackTime);
      keepAudioNearLive(a);

      if (a.seekable.length === 0) {
        const handleCanPlay = () => {
          seekAudioNearLive(a, fallbackTime);
          keepAudioNearLive(a);
          a.removeEventListener("canplay", handleCanPlay);
          a.removeEventListener("loadedmetadata", handleCanPlay);
        };

        a.addEventListener("canplay", handleCanPlay);
        a.addEventListener("loadedmetadata", handleCanPlay);
      }

      // Update modeRef synchronously before pausing so the onPause handler in
      // use-player sees the new mode and does not fight the handoff.
      setModeBoth("audio");

      // Only pause the video element after the audio fallback is confirmed.
      try {
        video.pause();
      } catch {}
    } catch {
      // If Safari blocks, stay in video mode (it may still pause in background).
      setModeBoth("video");
    }
  }, [enabled, hlsUrl, ensureAudio, keepAudioNearLive, seekAudioNearLive, setModeBoth, videoRef]);

  const toVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    const wasInAudioMode = modeRef.current === "audio";

    // Stop audio
    const a = audioRef.current;
    if (a) {
      try {
        a.playbackRate = 1;
        a.pause();
      } catch {}
    }

    setModeBoth("video");

    // Only force-reload the IVS player if we actually switched to audio mode.
    // If the tab was hidden briefly and audio never took over, the video element
    // is still playing and a force-reload would cause unnecessary buffering.
    if (wasInAudioMode) {
      await onRestoreVideo?.({ forceReload: true });
    }
  }, [videoRef, onRestoreVideo, setModeBoth]);

  // Cleanup: stop and discard the audio element on unmount.
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        try {
          a.pause();
          a.src = "";
          a.load();
        } catch {}
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mode !== "audio") return;

    const audio = audioRef.current;
    if (!audio) return;

    const syncToLive = () => keepAudioNearLive(audio);
    syncToLive();

    const interval = window.setInterval(syncToLive, LIVE_EDGE_SYNC_INTERVAL_MS);
    audio.addEventListener("timeupdate", syncToLive);
    audio.addEventListener("progress", syncToLive);
    audio.addEventListener("canplay", syncToLive);

    return () => {
      window.clearInterval(interval);
      audio.removeEventListener("timeupdate", syncToLive);
      audio.removeEventListener("progress", syncToLive);
      audio.removeEventListener("canplay", syncToLive);
      audio.playbackRate = 1;
    };
  }, [keepAudioNearLive, mode]);

  return { mode, prime, toAudio, toVideo, getAudioEl: () => audioRef.current };
}
