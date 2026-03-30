// components/ivs/hooks/use-player-core.tsx
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

export function usePlayerCore({
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

  const hasPlayedRef = useRef(false);

  const [mode, setMode] = useState<PlayerMode>("idle");
  const [stats, setStats] = useState<StatsState>({});
  const [playerState, setPlayerState] = useState<PlayerState | "INIT">("INIT");
  const [isMuted, setIsMuted] = useState(false);
  const [playerVersion, setPlayerVersion] = useState(0);

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
        p.load(src);
        if (autoPlay && v) {
          await v.play().catch(() => setMode("gate"));
        }
        backoffRef.current = START_BACKOFF;
      } catch {
        scheduleRetry();
      }
    }, delay);
  }, [autoPlay, src, videoRef]);

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
      try { p.load(src); } catch {
        scheduleRetry();
        setMode("gate");
        return;
      }
      try {
        await v.play();
        // mode will be set to "playing" by onPlayingInternal
      } catch {
        setMode("gate");
      }
      return;
    }

    if (now - lastRestoreRef.current < RESTORE_COOLDOWN_MS) return;
    lastRestoreRef.current = now;

    const state = p.getState();

    if (state === IvsPlayerState.PLAYING) {
      if (v.paused) {
        try { await v.play(); } catch { setMode("gate"); }
      }
      return;
    }

    if (state === IvsPlayerState.BUFFERING || state === IvsPlayerState.READY) {
      try { await v.play(); return; } catch {}
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
        try { await v.play(); return; } catch {
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
      p.load(src);
    } catch {
      scheduleRetry();
      setMode("gate");
      return;
    }
    try {
      await v.play();
      // mode set to "playing" by onPlayingInternal
    } catch {
      setMode("gate");
    }
  }, [src, videoRef, clearRetry, scheduleRetry]);

  // ─── Manual play (user tap / click) ──────────────────────────────────────

  const handleManualPlay = useCallback(async () => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v) return;

    // Dismiss the gate immediately while play is initiating — prevents the iOS
    // race where p.load() briefly re-triggers "gate" state during startup.
    setMode("idle");

    clearRetry();
    backoffRef.current = START_BACKOFF;
    try {
      p.load(src);
    } catch {
      scheduleRetry();
      setMode("gate");
      return;
    }

    try {
      await v.play();
      // onPlayingInternal will transition mode → "playing"
    } catch {
      setMode("gate");
    }
  }, [videoRef, src, clearRetry, scheduleRetry]);

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
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v) return;
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
    setMode("idle");
    setIsMuted(false);
    setPlayerState("INIT");
    setStats({});

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

      try { p.load(src); } catch { scheduleRetry(); }

      if (autoPlay) {
        // Desktop: try autoplay with sound. Browser blocks it → show click-to-play.
        // Never fall back to muted autoplay.
        try {
          await v.play();
          // mode → "playing" via onPlayingInternal
        } catch {
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
      playerRef.current = null;
      cleanup?.();
    };
  }, [src, autoPlay, videoRef, onEnded, onPlaying, onError, onTextMetadata, updateStats, scheduleRetry, clearRetry]);

  return {
    playerRef,
    playerVersion,
    mode,
    stats,
    playerState,
    isMuted,
    hasPlayedRef,
    updateStats,
    scheduleRetry,
    restoreToLive,
    handleManualPlay,
    tapToUnmute,
  };
}
