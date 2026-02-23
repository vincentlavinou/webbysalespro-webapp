// components/ivs/hooks/use-player.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Player,
  PlayerError,
  PlayerState,
  TextMetadataCue,
} from "amazon-ivs-player";
import { PlayerEventType } from "amazon-ivs-player";

const START_BACKOFF = 800;
const MAX_BACKOFF = 8000;
const JITTER = 0.25;

type Options = {
  src: string;
  autoPlay: boolean;
  mutedProp: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTextMetadata?: (text: string) => void;
  onEnded?: () => void;
  onError?: (e: PlayerError) => void;
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
  onError,
}: Options) {
  const playerRef = useRef<Player | null>(null);
  const disposedRef = useRef(false);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(START_BACKOFF);

  const hasPlayedRef = useRef(false);

  const [stats, setStats] = useState<StatsState>({});
  const [playerState, setPlayerState] = useState<PlayerState | "INIT">("INIT");
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
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
  }, [autoPlay, src, videoRef, clearRetry]);

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

  const restoreToLive = useCallback(async () => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v || disposedRef.current) return;
    clearRetry();
    backoffRef.current = START_BACKOFF;
    p.load(src);
    try {
      await v.play();
      setAutoplayFailed(false);
    } catch {
      setAutoplayFailed(true);
    }
  }, [src, videoRef, clearRetry]);

  const handleManualPlay = useCallback(async () => {
    const p = playerRef.current;
    const v = videoRef.current;
    if (!p || !v) return;
    
    restoreToLive()

    try {

      v.muted = true;
      // user gesture context -> safe to try unmute
      if (!mutedProp) {
        v.muted = false;
        p.setMuted(false);
        setIsMuted(false);
      }
    } catch {
        
    }
  }, [videoRef, mutedProp, restoreToLive]);

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

  useEffect(() => {
    disposedRef.current = false;
    hasPlayedRef.current = false;

    setAutoplayFailed(false);
    setIsMuted(true);
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
      const onPlaying = () => {
        backoffRef.current = START_BACKOFF;
        setAutoplayFailed(false);
        updateStats();
        hasPlayedRef.current = true;

        // best-effort unmute (will succeed if user gesture exists)
        if (!mutedProp) {
          try {
            p.setMuted(false);
            v.muted = false;
            setIsMuted(false);
          } catch {}
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
      p.addEventListener(ivs.PlayerState.PLAYING, onPlaying);
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
        try {
          await v.play();
          setAutoplayFailed(false);
        } catch {
          setAutoplayFailed(true);
        }
      }

      cleanup = () => {
        p.removeEventListener(ivs.PlayerState.READY, onReady);
        p.removeEventListener(ivs.PlayerState.PLAYING, onPlaying);
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
  }, [src, autoPlay, mutedProp, videoRef, onEnded, onError, onTextMetadata, updateStats, scheduleRetry, clearRetry]);

  return {
    playerRef,
    playerVersion,
    stats,
    playerState,
    autoplayFailed,
    isMuted,
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