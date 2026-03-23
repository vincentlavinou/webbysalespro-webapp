// components/ivs/hooks/use-player.tsx
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

const START_BACKOFF = 800;
const MAX_BACKOFF = 8000;
const JITTER = 0.25;
const RESTORE_COOLDOWN_MS = 3000;
const FORCE_RELOAD_COOLDOWN_MS = 1500;

// iOS Safari requires a user gesture before any media plays with audio.
// Attempting autoplay and catching the error causes timing issues where audio
// never starts even after the user taps. Detect iOS and skip the attempt.
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

type Options = {
  src: string;
  autoPlay: boolean;
  mutedProp: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTextMetadata?: (text: string) => void;
  onEnded?: () => void;
  onPlaying?: () => void;
  onError?: (e: PlayerError) => void;
  /** Keep the player muted and re-play if the browser pauses it, so timed metadata cues keep firing while something else (e.g. video injection) is in the foreground. */
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

export function usePlayer({
  src,
  autoPlay,
  mutedProp,
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

  const [stats, setStats] = useState<StatsState>({});
  const [playerState, setPlayerState] = useState<PlayerState | "INIT">("INIT");
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playerVersion, setPlayerVersion] = useState(0);

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
          await v.play().catch(() => setAutoplayFailed(true));
        }
        backoffRef.current = START_BACKOFF;
      } catch {
        scheduleRetry();
      }
    }, delay);
  }, [autoPlay, src, videoRef]);

  const updateStats = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      const state = p.getState();
      setPlayerState(state);
      setIsPlayerReady(state !== IvsPlayerState.IDLE);
      setStats({
        latency: p.getLiveLatency(),
        bitrate: Math.round((p.getQuality()?.bitrate ?? 0) / 1000) || undefined,
        resolution: `${p.getDisplayWidth()}x${p.getDisplayHeight()}`,
        state,
      });
    } catch {}
  }, []);

  const restoreToLive = useCallback(async (options?: { forceReload?: boolean }) => {
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
      } catch {
        scheduleRetry();
      }

      try {
        await v.play();
        setAutoplayFailed(false);
      } catch {
        setAutoplayFailed(true);
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
        } catch {
          setAutoplayFailed(true);
        }
      } else {
        setAutoplayFailed(false);
      }
      return;
    }

    if (state === IvsPlayerState.BUFFERING || state === IvsPlayerState.READY) {
      try {
        await v.play();
        setAutoplayFailed(false);
        return;
      } catch {}
    }

    clearRetry();
    backoffRef.current = START_BACKOFF;
    p.load(src);
    try {
      await v.play();
      setAutoplayFailed(false);
    } catch {
      setAutoplayFailed(true);
    }
  }, [src, videoRef, clearRetry, scheduleRetry]);

  const handleManualPlay = useCallback(async () => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v) return;

    // Reload from live edge — IVS setRebufferToLive(true) ensures we land at the
    // live edge on load. Do this before play() so the gesture covers the play call.
    clearRetry();
    backoffRef.current = START_BACKOFF;
    p.load(src);

    // Set desired mute state BEFORE play() within the user gesture context.
    // Do NOT mute first then unmute — iOS may consume the gesture on the muted play.
    const wantMuted = mutedProp;
    p.setMuted(wantMuted);
    v.muted = wantMuted;
    setIsMuted(wantMuted);

    try {
      await v.play();
      setAutoplayFailed(false);
    } catch {
      // Still blocked — keep the overlay up so user can try again
      setAutoplayFailed(true);
    }
  }, [videoRef, mutedProp, src, clearRetry]);

  const tapToUnmute = useCallback(() => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v) return;
    try {
      v.muted = false;
      p.setMuted(false);
      setIsMuted(false);
    } catch {}
  }, [videoRef]);

  // Live playback should not remain paused. Re-play on pause unless a caller
  // explicitly marks the pause as intentional, such as a successful
  // handoff from the video element to the background audio element.
  useEffect(() => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v) return;

    if (keepAlive) {
      p.setMuted(true);
      v.muted = true;
      setIsMuted(true);
    }

    if (!keepAlive) {
      p.setMuted(mutedProp);
      v.muted = mutedProp;
      setIsMuted(mutedProp);
    }

    if (v.paused && (shouldPreventPause?.() ?? true)) {
      v.play().catch(() => {});
    }

    const onPause = () => {
      if (disposedRef.current) return;
      if (!(shouldPreventPause?.() ?? true)) return;
      v.play().catch(() => {});
    };

    v.addEventListener("pause", onPause);
    return () => v.removeEventListener("pause", onPause);
  }, [keepAlive, mutedProp, shouldPreventPause, videoRef]);

  useEffect(() => {
    disposedRef.current = false;
    hasPlayedRef.current = false;

    setAutoplayFailed(false);
    setIsMuted(true);
    setIsPlayerReady(false);
    setPlayerState("INIT");
    setStats({});

    let cleanup: (() => void) | undefined;

    (async () => {
      const v = videoRef.current;
      if (!v) return;

      const ivs = await import("amazon-ivs-player");
      if (disposedRef.current) return;

      if (!ivs.isPlayerSupported) {
        console.warn("IVS Player not supported.");
        return;
      }

      const p = ivs.create({
        wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
        wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
      });

      playerRef.current = p;
      p.attachHTMLVideoElement(v);
      setPlayerVersion(v => v + 1);

      p.setAutoplay(autoPlay);
      p.setMuted(true); // always start muted (iOS)
      p.setAutoQualityMode(true);
      p.setLiveLowLatencyEnabled(true);
      p.setRebufferToLive(true);

      const onReady = () => updateStats();
      const onPlayingInternal = () => {
        backoffRef.current = START_BACKOFF;
        setAutoplayFailed(false);
        updateStats();
        hasPlayedRef.current = true;
        onPlaying?.();

        // Link this video element's audio session to the shared Web Audio context
        // so the cta-announcement ching sound plays on iOS without being suspended.
        if (v) setSharedAudioContext(v);

        // best-effort unmute (will succeed if user gesture exists)
        if (!mutedProp) {
          try {
            p.setMuted(false);
            v.muted = false;
          } catch {}
          // Always sync with actual element state — browser autoplay policy
          // may silently keep the video muted even if no exception is thrown.
          setIsMuted(v.muted);
        }
      };

      const onEndedInternal = () => {
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
        try {
          onTextMetadata?.(payload.text);
        } catch {}
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
      } catch {
        scheduleRetry();
      }

      if (autoPlay) {
        // On iOS, skip the autoplay attempt entirely — it will either play muted
        // (no audio) or throw. Show the play gate immediately so the user's tap
        // happens within a clean gesture context that iOS will honour with audio.
        if (isIOS()) {
          setAutoplayFailed(true);
        } else {
          try {
            await v.play();
            setAutoplayFailed(false);
          } catch {
            setAutoplayFailed(true);
          }
        }
      } else {
        // No autoplay requested — always show the play gate so user initiates.
        setAutoplayFailed(true);
      }

      cleanup = () => {
        p.removeEventListener(ivs.PlayerState.READY, onReady);
        p.removeEventListener(ivs.PlayerState.PLAYING, onPlayingInternal);
        p.removeEventListener(ivs.PlayerState.BUFFERING, updateStats);
        p.removeEventListener(ivs.PlayerState.IDLE, updateStats);
        p.removeEventListener(ivs.PlayerState.ENDED, onEndedInternal);
        p.removeEventListener(PlayerEventType.ERROR, onErrorInternal);
        p.removeEventListener(PlayerEventType.TEXT_METADATA_CUE, onMeta);
        try {
          p.pause();
          p.delete();
        } catch {}
      };
    })();

    return () => {
      disposedRef.current = true;
      clearRetry();
      playerRef.current = null;
      cleanup?.();
    };
  }, [src, autoPlay, mutedProp, videoRef, onEnded, onPlaying, onError, onTextMetadata, updateStats, scheduleRetry, clearRetry]);

  return {
    playerRef,
    playerVersion,
    stats,
    playerState,
    autoplayFailed,
    isMuted,
    isPlayerReady,
    hasPlayedRef,
    setAutoplayFailed,
    setIsMuted,
    updateStats,
    scheduleRetry,
    restoreToLive,
    handleManualPlay,
    tapToUnmute,
  };
}
