// components/ivs/hooks/use-ivs-player-core.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Player,
  PlayerError,
  PlayerState,
  TextMetadataCue,
} from "amazon-ivs-player";
import { PlayerEventType, PlayerState as IvsPlayerState } from "amazon-ivs-player";
import { setSharedAudioContext } from "@/chat/hooks/use-cta-announcements";

// ─── Player mode ────────────────────────────────────────────────────────────
// Single source of truth for what the player is doing from a UI/behavior perspective.
// IVS internal state (BUFFERING, IDLE, etc.) is kept separately for latency/stats only.
export type PlayerMode =
  | "idle"        // initialising — show loading spinner
  | "gate"        // ready, waiting for user tap / click
  | "playing"     // live and playing
  | "playing-muted" // live and playing, but the media element is muted
  | "ended"       // stream ended
  | "unsupported" // IVS SDK not supported on this device (Android HLS fallback)

// ─── Constants ──────────────────────────────────────────────────────────────
const START_BACKOFF = 800;
const MAX_BACKOFF = 8000;
const JITTER = 0.25;
const RESTORE_COOLDOWN_MS = 3000;
const FORCE_RELOAD_COOLDOWN_MS = 1500;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

// Watches a <video> element and fires `onFrame` exactly once when the first
// real frame is on screen. Primary signal is requestVideoFrameCallback (fires
// on composited frame). Fallback: HTML5 events + a slow poll for browsers
// without rVFC.
type RvfcVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: () => void) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

function detectFirstFrame(
  video: HTMLVideoElement,
  onFrame: () => void,
): () => void {
  let done = false;
  let rvfcHandle: number | undefined;

  const isFramePainted = () =>
    video.readyState >= 3 /* HAVE_FUTURE_DATA */ &&
    video.videoWidth > 0 &&
    video.videoHeight > 0;

  const fire = () => {
    if (done) return;
    done = true;
    cleanup();
    onFrame();
  };

  const maybeFire = () => {
    if (done) return;
    if (isFramePainted() && !video.paused) fire();
  };

  const cleanup = () => {
    const rvfcVideo = video as RvfcVideo;
    if (rvfcHandle !== undefined && typeof rvfcVideo.cancelVideoFrameCallback === "function") {
      try { rvfcVideo.cancelVideoFrameCallback(rvfcHandle); } catch {}
    }
    clearInterval(pollHandle);
    video.removeEventListener("loadeddata", maybeFire);
    video.removeEventListener("playing", maybeFire);
    video.removeEventListener("timeupdate", maybeFire);
    video.removeEventListener("canplay", maybeFire);
  };

  const rvfcVideo = video as RvfcVideo;
  if (typeof rvfcVideo.requestVideoFrameCallback === "function") {
    rvfcHandle = rvfcVideo.requestVideoFrameCallback(() => fire());
  }

  video.addEventListener("loadeddata", maybeFire);
  video.addEventListener("playing", maybeFire);
  video.addEventListener("timeupdate", maybeFire);
  video.addEventListener("canplay", maybeFire);
  const pollHandle = setInterval(maybeFire, 250);

  maybeFire();
  return cleanup;
}

const STARTUP_TIMEOUT_MS = 7000;

type Options = {
  src: string;
  autoPlay: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTextMetadata?: (text: string) => void;
  onEnded?: () => void;
  onPlaying?: () => void;
  onError?: (e: PlayerError) => void;
  /** Re-play if the browser pauses it so timed metadata cues keep firing (e.g. video injection overlay). */
  keepAlive?: boolean;
  /** Return false when a pause is intentional and should not be immediately reversed. */
  shouldPreventPause?: () => boolean;
};

type StatsState = {
  latency?: number;
  bitrate?: number;
  resolution?: string;
  state?: string;
};

export function useIvsPlayerCore({
  src,
  autoPlay,
  videoRef,
  onTextMetadata,
  onEnded,
  onPlaying,
  onError,
  keepAlive = false,
  shouldPreventPause,
}: Options) {
  const playerRef = useRef<Player | null>(null);
  const disposedRef = useRef(false);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(START_BACKOFF);
  const lastRestoreRef = useRef<number>(0);
  const lastForcedReloadRef = useRef<number>(0);
  const manualPlayInFlightRef = useRef(false);

  const hasPlayedRef = useRef(false);
  const firstFrameRenderedRef = useRef(false);
  const firstFrameCleanupRef = useRef<(() => void) | null>(null);
  const startupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<PlayerMode>("idle");
  const [stats, setStats] = useState<StatsState>({});
  const [playerState, setPlayerState] = useState<PlayerState | "INIT">("INIT");
  const [isMuted, setIsMuted] = useState(false);
  const [playerVersion, setPlayerVersion] = useState(0);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [firstFrameRendered, setFirstFrameRendered] = useState(false);

  // ─── First-frame detection ────────────────────────────────────────────────
  // Reset and rearm whenever we issue a new p.load(src), so the spinner stays
  // visible until a real frame is on screen — not just when IVS reports PLAYING.

  const clearStartupTimeout = useCallback(() => {
    if (startupTimeoutRef.current) {
      clearTimeout(startupTimeoutRef.current);
      startupTimeoutRef.current = null;
    }
  }, []);

  const armFirstFrameDetection = useCallback(() => {
    const v = videoRef.current;
    firstFrameCleanupRef.current?.();
    firstFrameCleanupRef.current = null;
    firstFrameRenderedRef.current = false;
    setFirstFrameRendered(false);
    if (!v) return;
    firstFrameCleanupRef.current = detectFirstFrame(v, () => {
      firstFrameRenderedRef.current = true;
      setFirstFrameRendered(true);
      clearStartupTimeout();
    });
  }, [clearStartupTimeout, videoRef]);

  // ─── Retry helpers ────────────────────────────────────────────────────────

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const jitter = (ms: number) => {
    const d = ms * JITTER;
    return Math.round(ms + (Math.random() * 2 - 1) * d);
  };

  const scheduleRetry = useCallback(() => {
    if (disposedRef.current) return;
    if (retryTimerRef.current) return;

    const delay = jitter(backoffRef.current);
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);

    retryTimerRef.current = setTimeout(async () => {
      retryTimerRef.current = null;
      const p = playerRef.current;
      const v = videoRef.current;
      if (disposedRef.current || !p) return;

      try {
        armFirstFrameDetection();
        p.load(src);
        setLastErrorMessage(null);
        if (autoPlay && v) {
          await v.play().catch((error) => {
            const message = getErrorMessage(error, "Browser blocked playback.");
            console.warn("IVS autoplay failed:", message, error);
            setLastErrorMessage(message);
            setMode("gate");
          });
        }
        backoffRef.current = START_BACKOFF;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to load the playback URL.");
        console.warn("IVS retry load failed:", message, error);
        setLastErrorMessage(message);
        scheduleRetry();
      }
    }, delay);
  }, [armFirstFrameDetection, autoPlay, src, videoRef]);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const updateStats = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const state = p.getState();
      setPlayerState(state);
      setStats({
        latency: p.getLiveLatency(),
        bitrate: Math.round((p.getQuality()?.bitrate ?? 0) / 1000) || undefined,
        resolution: `${p.getDisplayWidth()}x${p.getDisplayHeight()}`,
        state,
      });
    } catch {}
  }, []);

  // ─── Restore to live ──────────────────────────────────────────────────────

  const restoreToLive = useCallback(async (options?: { forceReload?: boolean; gracePeriodMs?: number }) => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v || disposedRef.current) return;

    const now = Date.now();
    const forceReload = options?.forceReload ?? false;

    if (forceReload) {
      if (now - lastForcedReloadRef.current < FORCE_RELOAD_COOLDOWN_MS) return;
      lastForcedReloadRef.current = now;
      clearRetry();
      backoffRef.current = START_BACKOFF;
      try {
        armFirstFrameDetection();
        p.load(src);
        setLastErrorMessage(null);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to reload the playback URL.");
        console.warn("IVS force reload failed:", message, error);
        setLastErrorMessage(message);
        scheduleRetry();
        setMode("gate");
        return;
      }
      try {
        await v.play();
        // mode will be set to "playing" by onPlayingInternal
      } catch (error) {
        const message = getErrorMessage(error, "Browser blocked playback.");
        console.warn("IVS force reload play failed:", message, error);
        setLastErrorMessage(message);
        setMode("gate");
      }
      return;
    }

    if (now - lastRestoreRef.current < RESTORE_COOLDOWN_MS) return;
    lastRestoreRef.current = now;

    const state = p.getState();

    if (state === IvsPlayerState.PLAYING) {
      if (v.paused) {
        try {
          await v.play();
          setLastErrorMessage(null);
        } catch (error) {
          const message = getErrorMessage(error, "Browser blocked playback.");
          console.warn("IVS restore play failed from PLAYING:", message, error);
          setLastErrorMessage(message);
          setMode("gate");
        }
      }
      return;
    }

    if (state === IvsPlayerState.BUFFERING || state === IvsPlayerState.READY) {
      try {
        await v.play();
        setLastErrorMessage(null);
        return;
      } catch (error) {
        const message = getErrorMessage(error, "Browser blocked playback.");
        console.warn("IVS restore play failed from READY/BUFFERING:", message, error);
        setLastErrorMessage(message);
      }
    }

    // IVS is IDLE — can happen transiently during fullscreen transitions.
    // Wait the grace period before deciding to reload.
    if (options?.gracePeriodMs && options.gracePeriodMs > 0) {
      await new Promise<void>(resolve => setTimeout(resolve, options.gracePeriodMs));
      if (disposedRef.current) return;

      const recovered = p.getState();
      if (
        recovered === IvsPlayerState.PLAYING ||
        recovered === IvsPlayerState.BUFFERING ||
        recovered === IvsPlayerState.READY
      ) {
        if (!v.paused) return; // already playing — stream recovered on its own
        try {
          await v.play();
          setLastErrorMessage(null);
          return;
        } catch (error) {
          const message = getErrorMessage(error, "Browser blocked playback.");
          console.warn("IVS recovered stream could not resume playback:", message, error);
          setLastErrorMessage(message);
          // IVS recovered but video element needs a user gesture — show gate,
          // don't reload the healthy stream.
          setMode("gate");
          return;
        }
      }
      // Still IDLE after grace period — fall through to reload.
    }

    clearRetry();
    backoffRef.current = START_BACKOFF;
    try {
      armFirstFrameDetection();
      p.load(src);
      setLastErrorMessage(null);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to reload the playback URL.");
      console.warn("IVS restore load failed:", message, error);
      setLastErrorMessage(message);
      scheduleRetry();
      setMode("gate");
      return;
    }
    try {
      await v.play();
      setLastErrorMessage(null);
      // mode set to "playing" by onPlayingInternal
    } catch (error) {
      const message = getErrorMessage(error, "Browser blocked playback.");
      console.warn("IVS restore play failed:", message, error);
      setLastErrorMessage(message);
      setMode("gate");
    }
  }, [armFirstFrameDetection, src, videoRef, clearRetry, scheduleRetry]);

  // ─── Manual play (user tap / click) ──────────────────────────────────────

  const handleManualPlay = useCallback(async () => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v || manualPlayInFlightRef.current) return;
    manualPlayInFlightRef.current = true;

    // Dismiss the gate immediately while play is initiating — prevents the iOS
    // race where p.load() briefly re-triggers "gate" state during startup.
    setMode("idle");

    clearRetry();
    backoffRef.current = START_BACKOFF;
    try {
      armFirstFrameDetection();
      p.load(src);
      setLastErrorMessage(null);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load the playback URL.");
      console.warn("IVS manual load failed:", message, error);
      setLastErrorMessage(message);
      scheduleRetry();
      setMode("gate");
      manualPlayInFlightRef.current = false;
      return;
    }

    // Safety net: if no real frame paints within STARTUP_TIMEOUT_MS, drop back
    // to the gate so the user can retry instead of staring at a black <video>.
    clearStartupTimeout();
    startupTimeoutRef.current = setTimeout(() => {
      startupTimeoutRef.current = null;
      if (disposedRef.current || firstFrameRenderedRef.current) return;
      console.warn("IVS manual play: no first frame within timeout.");
      setLastErrorMessage("Couldn't start the stream. Tap to try again.");
      setMode("gate");
      manualPlayInFlightRef.current = false;
    }, STARTUP_TIMEOUT_MS);

    try {
      await v.play();
      setLastErrorMessage(null);
      // onPlayingInternal will transition mode → "playing"; the spinner stays
      // up until firstFrameRendered flips.
    } catch (error) {
      const message = getErrorMessage(error, "Browser blocked playback.");
      console.warn("IVS manual play failed:", message, error);
      setLastErrorMessage(message);
      setMode("gate");
      clearStartupTimeout();
    } finally {
      manualPlayInFlightRef.current = false;
    }
  }, [armFirstFrameDetection, clearStartupTimeout, videoRef, src, clearRetry, scheduleRetry]);

  // ─── Tap to unmute ────────────────────────────────────────────────────────

  const tapToUnmute = useCallback(() => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v) return;
    try {
      v.muted = false;
    } catch {}
    setIsMuted(v.muted);
  }, [videoRef]);

  // ─── Pause prevention (live stream must not stay paused) ──────────────────

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const canForcePlayback = autoPlay || hasPlayedRef.current;

    setIsMuted(v.muted);

    if (canForcePlayback && v.paused && (shouldPreventPause?.() ?? true)) {
      v.play().catch(() => {});
    }

    const syncMutedState = () => {
      setIsMuted(v.muted);
      setMode(current => {
        if (current === "playing" && v.muted) return "playing-muted";
        if (current === "playing-muted" && !v.muted) return "playing";
        return current;
      });
    };

    const onPause = () => {
      if (disposedRef.current) return;
      if (!(autoPlay || hasPlayedRef.current)) return;
      if (!(shouldPreventPause?.() ?? true)) return;
      v.play().catch(() => {});
    };

    v.addEventListener("volumechange", syncMutedState);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("volumechange", syncMutedState);
      v.removeEventListener("pause", onPause);
    };
  }, [autoPlay, keepAlive, shouldPreventPause, videoRef]);

  // ─── IVS player init / teardown ───────────────────────────────────────────

  useEffect(() => {
    disposedRef.current = false;
    hasPlayedRef.current = false;
    manualPlayInFlightRef.current = false;
    firstFrameRenderedRef.current = false;
    setMode("idle");
    setIsMuted(false);
    setPlayerState("INIT");
    setStats({});
    setLastErrorMessage(null);
    setFirstFrameRendered(false);

    let cleanup: (() => void) | undefined;

    (async () => {
      const v = videoRef.current;
      if (!v) return;

      const ivs = await import("amazon-ivs-player");
      if (disposedRef.current) return;

      if (!ivs.isPlayerSupported) {
        console.warn("IVS Player not supported on this device.");
        setMode("unsupported");
        return;
      }

      const p = ivs.create({
        wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
        wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
      });

      playerRef.current = p;
      p.attachHTMLVideoElement(v);
      setPlayerVersion(n => n + 1);

      p.setAutoplay(autoPlay);
      p.setAutoQualityMode(true);
      p.setLiveLowLatencyEnabled(true);
      p.setRebufferToLive(true);

      const onReady = () => updateStats();

      const onPlayingInternal = () => {
        backoffRef.current = START_BACKOFF;
        setMode(v.muted ? "playing-muted" : "playing");
        updateStats();
        hasPlayedRef.current = true;
        manualPlayInFlightRef.current = false;
        setLastErrorMessage(null);
        onPlaying?.();
        if (v) setSharedAudioContext(v);
        setIsMuted(v.muted);
      };

      const onEndedInternal = () => {
        setMode("ended");
        updateStats();
        onEnded?.();
      };

      const onErrorInternal = (e: PlayerError) => {
        updateStats();
        const message = e?.message || `${e?.source ?? "IVS"} error ${e?.code ?? ""}`.trim();
        console.warn("IVS player error:", e);
        setLastErrorMessage(message);
        onError?.(e);
        if (e?.code === 404 && e?.source === "MasterPlaylist") {
          scheduleRetry();
        }
      };

      const onMeta = (payload: TextMetadataCue) => {
        try { onTextMetadata?.(payload.text); } catch {}
      };

      p.addEventListener(ivs.PlayerState.READY, onReady);
      p.addEventListener(ivs.PlayerState.PLAYING, onPlayingInternal);
      p.addEventListener(ivs.PlayerState.BUFFERING, updateStats);
      p.addEventListener(ivs.PlayerState.IDLE, updateStats);
      p.addEventListener(ivs.PlayerState.ENDED, onEndedInternal);
      p.addEventListener(PlayerEventType.ERROR, onErrorInternal);
      p.addEventListener(PlayerEventType.TEXT_METADATA_CUE, onMeta);

      try {
        armFirstFrameDetection();
        p.load(src);
        setLastErrorMessage(null);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to load the playback URL.");
        console.warn("IVS initial load failed:", message, error);
        setLastErrorMessage(message);
        scheduleRetry();
      }

      if (autoPlay) {
        // Desktop: try autoplay with sound. Browser blocks it → show click-to-play.
        // Never fall back to muted autoplay.
        try {
          await v.play();
          setLastErrorMessage(null);
          // mode → "playing" via onPlayingInternal
        } catch (error) {
          const message = getErrorMessage(error, "Browser blocked playback.");
          console.warn("IVS autoplay play failed:", message, error);
          setLastErrorMessage(message);
          setMode("gate");
        }
      } else {
        // iOS / Android: skip autoplay entirely — show tap-to-play immediately
        // so the user's first tap is in a clean gesture context for audio unlock.
        setMode("gate");
      }

      cleanup = () => {
        p.removeEventListener(ivs.PlayerState.READY, onReady);
        p.removeEventListener(ivs.PlayerState.PLAYING, onPlayingInternal);
        p.removeEventListener(ivs.PlayerState.BUFFERING, updateStats);
        p.removeEventListener(ivs.PlayerState.IDLE, updateStats);
        p.removeEventListener(ivs.PlayerState.ENDED, onEndedInternal);
        p.removeEventListener(PlayerEventType.ERROR, onErrorInternal);
        p.removeEventListener(PlayerEventType.TEXT_METADATA_CUE, onMeta);
        try { p.pause(); p.delete(); } catch {}
      };
    })();

    return () => {
      disposedRef.current = true;
      clearRetry();
      clearStartupTimeout();
      firstFrameCleanupRef.current?.();
      firstFrameCleanupRef.current = null;
      playerRef.current = null;
      cleanup?.();
    };
  }, [src, autoPlay, videoRef, onEnded, onPlaying, onError, onTextMetadata, updateStats, scheduleRetry, clearRetry, armFirstFrameDetection, clearStartupTimeout]);

  return {
    playerRef,
    playerVersion,
    mode,
    stats,
    playerState,
    isMuted,
    lastErrorMessage,
    firstFrameRendered,
    hasPlayedRef,
    updateStats,
    scheduleRetry,
    restoreToLive,
    handleManualPlay,
    tapToUnmute,
  };
}
