// components/ivs/hooks/use-ivs-player-core.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Player,
  PlayerError,
  PlayerState,
  TextMetadataCue,
} from "amazon-ivs-player";
import { PlayerEventType, PlayerState as IvsPlayerState } from "../ivs-runtime-enums";
import { setSharedAudioContext } from "@/chat/hooks/use-cta-announcements";

// ─── Player mode ────────────────────────────────────────────────────────────
// Single source of truth for what the player is doing from a UI/behavior perspective.
// IVS internal state (BUFFERING, IDLE, etc.) is kept separately for latency/stats only.
export type PlayerMode =
  | "idle"        // initialising — show loading spinner
  | "playing"     // live and playing
  | "playing-muted" // live, media element muted (or blocked until the unmute tap)
  | "ended"       // stream ended — prompt the attendee to refresh the stream
  | "error"       // fatal playback error — prompt the attendee to refresh the stream
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

type Options = {
  src: string;
  autoPlay: boolean;
  /** Start playback muted (e.g. iOS, which only allows muted inline autoplay). */
  startMuted?: boolean;
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
  startMuted = false,
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
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

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

  // Start playback without ever showing a tap-to-start gate: try as-is first
  // (unmuted on desktop), fall back to muted — which browsers allow for inline
  // autoplay — and if even muted playback is blocked leave the "tap to unmute"
  // nudge up: that tap doubles as the play gesture (see tapToUnmute).
  const attemptPlayback = useCallback(async () => {
    const v = videoRef.current;
    if (!v || disposedRef.current) return;

    try {
      await v.play();
      setLastErrorMessage(null);
      return;
    } catch (error) {
      console.warn(
        "IVS playback blocked, falling back to muted:",
        getErrorMessage(error, "Browser blocked playback."),
      );
    }

    v.muted = true;
    v.defaultMuted = true;
    setIsMuted(true);
    try {
      await v.play();
      setLastErrorMessage(null);
      // mode → "playing-muted" via onPlayingInternal
    } catch (error) {
      const message = getErrorMessage(error, "Browser blocked muted playback.");
      console.warn("IVS muted playback blocked:", message, error);
      setLastErrorMessage(message);
      // Only surface the unmute nudge when the player actually has a stream —
      // pre-live (404 retry loop) must keep showing the loading state.
      const state = playerRef.current?.getState();
      if (
        state === IvsPlayerState.READY ||
        state === IvsPlayerState.BUFFERING ||
        state === IvsPlayerState.PLAYING
      ) {
        setMode("playing-muted");
      }
    }
  }, [videoRef]);

  const scheduleRetry = useCallback(() => {
    if (disposedRef.current) return;
    if (retryTimerRef.current) return;

    const delay = jitter(backoffRef.current);
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);

    retryTimerRef.current = setTimeout(async () => {
      retryTimerRef.current = null;
      const p = playerRef.current;
      if (disposedRef.current || !p) return;

      try {
        p.load(src);
        setLastErrorMessage(null);
        if (autoPlay) {
          await attemptPlayback();
        }
        backoffRef.current = START_BACKOFF;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to load the playback URL.");
        console.warn("IVS retry load failed:", message, error);
        setLastErrorMessage(message);
        scheduleRetry();
      }
    }, delay);
  }, [autoPlay, src, attemptPlayback]);

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
        p.load(src);
        setLastErrorMessage(null);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to reload the playback URL.");
        console.warn("IVS force reload failed:", message, error);
        setLastErrorMessage(message);
        scheduleRetry();
        return;
      }
      await attemptPlayback();
      return;
    }

    if (now - lastRestoreRef.current < RESTORE_COOLDOWN_MS) return;
    lastRestoreRef.current = now;

    const state = p.getState();

    if (state === IvsPlayerState.PLAYING) {
      if (v.paused) {
        await attemptPlayback();
      }
      return;
    }

    if (state === IvsPlayerState.BUFFERING || state === IvsPlayerState.READY) {
      await attemptPlayback();
      return;
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
        // IVS recovered but the video element needs a nudge — attemptPlayback
        // falls back to muted rather than reloading the healthy stream.
        await attemptPlayback();
        return;
      }
      // Still IDLE after grace period — fall through to reload.
    }

    clearRetry();
    backoffRef.current = START_BACKOFF;
    try {
      p.load(src);
      setLastErrorMessage(null);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to reload the playback URL.");
      console.warn("IVS restore load failed:", message, error);
      setLastErrorMessage(message);
      scheduleRetry();
      return;
    }
    await attemptPlayback();
  }, [src, videoRef, clearRetry, scheduleRetry, attemptPlayback]);

  // ─── Tap to unmute ────────────────────────────────────────────────────────

  const tapToUnmute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false;
      v.defaultMuted = false;
    } catch {}
    setIsMuted(v.muted);
    // If even muted autoplay was blocked the video is still paused — this tap
    // is the user gesture that starts playback (with sound, since it was just
    // unmuted inside the gesture). Fall back to muted playback if needed.
    if (v.paused) {
      v.play().catch(() => {
        v.muted = true;
        v.defaultMuted = true;
        setIsMuted(true);
        v.play().catch(() => {});
      });
    }
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
    setMode("idle");
    setIsMuted(false);
    setPlayerState("INIT");
    setStats({});
    setLastErrorMessage(null);

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

      // Mute before autoplay so browsers that only permit muted inline autoplay
      // (iOS) can start without a user gesture; the "tap to unmute" nudge then
      // lets the user enable sound.
      if (startMuted) {
        v.muted = true;
        setIsMuted(true);
      }

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
          // Stream isn't available (pre-live or briefly gone) — retry quietly
          // behind the loading state.
          scheduleRetry();
          return;
        }
        // Any other error that leaves the player stopped: prompt the attendee
        // to refresh the stream, and keep retrying in the background so
        // transient failures self-heal.
        try {
          if (p.getState() === ivs.PlayerState.IDLE) {
            setMode("error");
            scheduleRetry();
          }
        } catch {}
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
        p.load(src);
        setLastErrorMessage(null);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to load the playback URL.");
        console.warn("IVS initial load failed:", message, error);
        setLastErrorMessage(message);
        scheduleRetry();
      }

      if (autoPlay) {
        // Desktop: try autoplay with sound; if the browser blocks it,
        // attemptPlayback falls back to muted so the attendee immediately sees
        // the stream with the "tap to unmute" nudge — never a tap-to-play gate.
        // iOS (startMuted): muted inline autoplay is permitted → starts in
        // "playing-muted" and the nudge handles sound.
        await attemptPlayback();
      } else {
        // No tap-to-start gate: stand on the muted state and let the unmute
        // nudge's tap double as the start gesture (see tapToUnmute).
        v.muted = true;
        v.defaultMuted = true;
        setIsMuted(true);
        setMode("playing-muted");
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
  }, [src, autoPlay, startMuted, videoRef, onEnded, onPlaying, onError, onTextMetadata, updateStats, scheduleRetry, clearRetry, attemptPlayback]);

  return {
    playerRef,
    playerVersion,
    mode,
    stats,
    playerState,
    isMuted,
    lastErrorMessage,
    hasPlayedRef,
    updateStats,
    scheduleRetry,
    restoreToLive,
    tapToUnmute,
  };
}
