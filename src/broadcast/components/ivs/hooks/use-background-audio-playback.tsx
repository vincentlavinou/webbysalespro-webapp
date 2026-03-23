// components/ivs/hooks/use-background-audio-playback.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const LIVE_EDGE_SAFETY_GAP_SEC = 0.5;

const LIVE_EDGE_DRIFT_TOLERANCE_SEC = 1.5;
const LIVE_EDGE_CATCHUP_RATE = 1.03;
const LIVE_EDGE_SYNC_INTERVAL_MS = 2000;

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
  // Tracks whether prime() successfully started the audio element playing.
  // iOS Safari only allows background audio if the element was already playing
  // before the app was backgrounded — priming must start (not just unlock) it.
  const [isPrimed, setIsPrimed] = useState(false);

  const setModeBoth = useCallback((next: "video" | "audio") => {
    modeRef.current = next;
    if (externalModeRef) externalModeRef.current = next;
    setMode(next);
  }, [externalModeRef]);

  const ensureAudio = useCallback(() => {
    if (!audioRef.current) {
      const a = document.createElement("audio");
      // Set muted as an HTML attribute — iOS sometimes ignores the JS property
      // alone when play() is called, which would cause audible double-audio.
      a.setAttribute("muted", "");
      a.muted = true;
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
   * Call inside a user-gesture path (Join/Play click).
   *
   * iOS Safari will only allow an audio element to keep playing after the app
   * is backgrounded if it was **already playing** at the moment of suspension.
   * Pausing after the gesture (the old approach) meant toAudio() had to call
   * play() asynchronously inside visibilitychange — but iOS suspends JS before
   * that promise resolves, so audio never actually started.
   *
   * Fix: start the audio element muted and keep it running. toAudio() then just
   * unmutes it synchronously — no async work needed before iOS suspends.
   */
  const prime = useCallback(async () => {
    if (!enabled || !hlsUrl) return;
    const a = ensureAudio();
    if (!a.paused) return; // already primed and playing
    if (a.src !== hlsUrl) a.src = hlsUrl;
    a.preload = "auto";
    a.muted = true;

    try {
      await a.play();
      seekAudioNearLive(a);
      setIsPrimed(true);
    } catch {
      // Best-effort. If blocked, background audio won't work for this session.
    }
  }, [enabled, hlsUrl, ensureAudio, seekAudioNearLive]);

  /**
   * Switch to audio mode when the app is backgrounded.
   * Must be synchronous — iOS suspends JS almost immediately after
   * visibilitychange fires, so any await here will not complete.
   */
  const toAudio = useCallback(() => {
    if (!enabled) return;
    const video = videoRef.current;
    const a = audioRef.current;
    // If audio isn't already playing (prime not called or failed), we cannot
    // start it now — iOS won't allow play() outside a user gesture in background.
    if (!video || !a || a.paused) return;

    // Sync audio to the video's exact playback position. The browser's native HLS
    // stack (used by the <audio> element) buffers independently from the IVS WASM
    // player and can lag by several seconds. Without this the user hears already-
    // seen content when they background.
    const videoTime = video.currentTime;
    if (Number.isFinite(videoTime) && videoTime > 0 && a.seekable.length > 0) {
      const liveEdge = a.seekable.end(a.seekable.length - 1);
      // Clamp to what the audio element has buffered; prefer video time.
      const target = Math.min(videoTime, Math.max(0, liveEdge - LIVE_EDGE_SAFETY_GAP_SEC));
      if (Math.abs(a.currentTime - target) > 0.3) {
        try { a.currentTime = target; } catch {}
      }
    }

    // Unmute — synchronous, completes before iOS suspends.
    a.muted = false;

    // Update mode ref synchronously so shouldPreventPause sees "audio" before
    // the video pause event fires.
    setModeBoth("audio");
    try { video.pause(); } catch {}
  }, [enabled, videoRef, setModeBoth]);

  const toVideo = useCallback(async () => {
    const wasInAudioMode = modeRef.current === "audio";
    const a = audioRef.current;

    if (a) {
      // Mute but keep playing so audio is ready for the next background.
      a.muted = true;
      a.playbackRate = 1;
    }

    setModeBoth("video");

    // Only reload IVS if we actually were in audio mode — avoids an unnecessary
    // buffering spinner when the tab was hidden only briefly.
    if (wasInAudioMode) {
      await onRestoreVideo?.({ forceReload: true });
    }
  }, [onRestoreVideo, setModeBoth]);

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

  // Keep the audio element at the live edge at all times (muted or not).
  // This runs as soon as prime() succeeds so the audio is already synced
  // when toAudio() unmutes it — no seeking gap on background.
  useEffect(() => {
    if (!isPrimed) return;
    const audio = audioRef.current;
    if (!audio) return;

    const syncToLive = () => {
      if (!audio.paused) keepAudioNearLive(audio);
    };
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
    };
  }, [isPrimed, keepAudioNearLive]);

  return { mode, prime, toAudio, toVideo, getAudioEl: () => audioRef.current };
}
