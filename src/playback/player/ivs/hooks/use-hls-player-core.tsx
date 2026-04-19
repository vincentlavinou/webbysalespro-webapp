"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { setSharedAudioContext } from "@/chat/hooks/use-cta-announcements";
import type { PlayerMode } from "./use-ivs-player-core";

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

function readSyncSafeInt(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] ?? 0) << 21) |
    ((data[offset + 1] ?? 0) << 14) |
    ((data[offset + 2] ?? 0) << 7) |
    (data[offset + 3] ?? 0)
  );
}

function readFrameSize(data: Uint8Array, offset: number, majorVersion: number): number {
  if (majorVersion === 4) {
    return readSyncSafeInt(data, offset);
  }

  return (
    (((data[offset] ?? 0) << 24) >>> 0) +
    ((data[offset + 1] ?? 0) << 16) +
    ((data[offset + 2] ?? 0) << 8) +
    (data[offset + 3] ?? 0)
  );
}

function findTerminator(data: Uint8Array, start: number, encoding: number): number {
  if (encoding === 1 || encoding === 2) {
    for (let i = start; i + 1 < data.length; i += 2) {
      if (data[i] === 0 && data[i + 1] === 0) return i;
    }
    return data.length;
  }

  for (let i = start; i < data.length; i += 1) {
    if (data[i] === 0) return i;
  }
  return data.length;
}

function decodeText(data: Uint8Array, encoding: number): string {
  try {
    if (encoding === 1) {
      return new TextDecoder("utf-16").decode(data).replace(/\0/g, "").trim();
    }
    if (encoding === 2) {
      return new TextDecoder("utf-16be").decode(data).replace(/\0/g, "").trim();
    }
    if (encoding === 3) {
      return new TextDecoder("utf-8").decode(data).replace(/\0/g, "").trim();
    }
    return new TextDecoder("iso-8859-1").decode(data).replace(/\0/g, "").trim();
  } catch {
    return "";
  }
}

function extractMetadataStrings(id3Data: Uint8Array): string[] {
  if (
    id3Data.length < 10 ||
    id3Data[0] !== 0x49 ||
    id3Data[1] !== 0x44 ||
    id3Data[2] !== 0x33
  ) {
    return [];
  }

  const majorVersion = id3Data[3] ?? 0;
  const flags = id3Data[5] ?? 0;
  const tagSize = readSyncSafeInt(id3Data, 6);
  let offset = 10;

  if ((flags & 0x40) !== 0 && id3Data.length >= 14) {
    const extHeaderSize = readFrameSize(id3Data, 10, majorVersion);
    offset += extHeaderSize;
  }

  const tagEnd = Math.min(id3Data.length, 10 + tagSize);
  const messages: string[] = [];

  while (offset + 10 <= tagEnd) {
    const frameId = String.fromCharCode(
      id3Data[offset],
      id3Data[offset + 1],
      id3Data[offset + 2],
      id3Data[offset + 3],
    );

    if (!frameId.trim()) break;

    const frameSize = readFrameSize(id3Data, offset + 4, majorVersion);
    if (frameSize <= 0) break;

    const frameStart = offset + 10;
    const frameEnd = frameStart + frameSize;
    if (frameEnd > tagEnd) break;

    const frameData = id3Data.subarray(frameStart, frameEnd);

    if (frameId[0] === "T" && frameData.length > 1) {
      const encoding = frameData[0] ?? 0;

      if (frameId === "TXXX") {
        const descEnd = findTerminator(frameData, 1, encoding);
        const valueStart =
          descEnd >= frameData.length
            ? frameData.length
            : descEnd + (encoding === 1 || encoding === 2 ? 2 : 1);
        const value = decodeText(frameData.subarray(valueStart), encoding);
        if (value) messages.push(value);
      } else {
        const value = decodeText(frameData.subarray(1), encoding);
        if (value) messages.push(value);
      }
    }

    offset = frameEnd;
  }

  return messages;
}

type Options = {
  src: string;
  autoPlay: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTextMetadata?: (text: string) => void;
  onEnded?: () => void;
  onPlaying?: () => void;
  keepAlive?: boolean;
  shouldPreventPause?: () => boolean;
};

type StatsState = {
  latency?: number;
  bitrate?: number;
  resolution?: string;
  state?: string;
  metadataEvents?: number;
};

export function useHlsPlayerCore({
  src,
  autoPlay,
  videoRef,
  onTextMetadata,
  onEnded,
  onPlaying,
  keepAlive = false,
  shouldPreventPause,
}: Options) {
  const hlsRef = useRef<Hls | null>(null);
  const disposedRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(START_BACKOFF);
  const lastRestoreRef = useRef<number>(0);
  const lastForcedReloadRef = useRef<number>(0);
  const manualPlayInFlightRef = useRef(false);
  const hasPlayedRef = useRef(false);

  const [mode, setMode] = useState<PlayerMode>("idle");
  const [stats, setStats] = useState<StatsState>({});
  const [playerState, setPlayerState] = useState<string>("INIT");
  const [isMuted, setIsMuted] = useState(false);
  const [playerVersion, setPlayerVersion] = useState(0);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const metadataEventsRef = useRef(0);

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

  const updateStats = useCallback(() => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!hls || !video) return;

    const level = hls.levels[hls.currentLevel] ?? hls.levels[hls.loadLevel] ?? null;
    const width = video.videoWidth || level?.width || 0;
    const height = video.videoHeight || level?.height || 0;

    setStats({
      latency: typeof hls.latency === "number" ? hls.latency : undefined,
      bitrate: level?.bitrate ? Math.round(level.bitrate / 1000) : undefined,
      resolution: width && height ? `${width}x${height}` : undefined,
      state: video.paused ? "PAUSED" : "PLAYING",
      metadataEvents: metadataEventsRef.current,
    });
  }, [videoRef]);

  const attachSource = useCallback(() => {
    const hls = hlsRef.current;
    if (!hls || disposedRef.current) return;
    hls.stopLoad();
    hls.loadSource(src);
    setPlayerState("LOADING");
  }, [src]);

  const scheduleRetry = useCallback(() => {
    if (disposedRef.current || retryTimerRef.current) return;

    const delay = jitter(backoffRef.current);
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      const hls = hlsRef.current;
      const video = videoRef.current;
      if (disposedRef.current || !hls || !video) return;

      try {
        attachSource();
        setLastErrorMessage(null);
        if (autoPlay) {
          void video.play().catch((error) => {
            const message = getErrorMessage(error, "Browser blocked playback.");
            setLastErrorMessage(message);
            setMode("gate");
          });
        }
        backoffRef.current = START_BACKOFF;
      } catch (error) {
        const message = getErrorMessage(error, "Failed to load the playback URL.");
        setLastErrorMessage(message);
        scheduleRetry();
      }
    }, delay);
  }, [attachSource, autoPlay, videoRef]);

  const restoreToLive = useCallback(async (options?: { forceReload?: boolean; gracePeriodMs?: number }) => {
    const hls = hlsRef.current;
    const video = videoRef.current;
    if (!hls || !video || disposedRef.current) return;

    const now = Date.now();
    const forceReload = options?.forceReload ?? false;

    if (forceReload) {
      if (now - lastForcedReloadRef.current < FORCE_RELOAD_COOLDOWN_MS) return;
      lastForcedReloadRef.current = now;

      clearRetry();
      backoffRef.current = START_BACKOFF;

      try {
        attachSource();
        setLastErrorMessage(null);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to reload the playback URL.");
        setLastErrorMessage(message);
        scheduleRetry();
        setMode("gate");
        return;
      }

      try {
        if (typeof hls.liveSyncPosition === "number") {
          video.currentTime = hls.liveSyncPosition;
        }
        await video.play();
      } catch (error) {
        const message = getErrorMessage(error, "Browser blocked playback.");
        setLastErrorMessage(message);
        setMode("gate");
      }
      return;
    }

    if (now - lastRestoreRef.current < RESTORE_COOLDOWN_MS) return;
    lastRestoreRef.current = now;

    if (!video.paused) return;

    if (options?.gracePeriodMs && options.gracePeriodMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, options.gracePeriodMs));
      if (disposedRef.current || !video.paused) return;
    }

    try {
      if (typeof hls.liveSyncPosition === "number") {
        video.currentTime = hls.liveSyncPosition;
      }
      await video.play();
      setLastErrorMessage(null);
    } catch (error) {
      const message = getErrorMessage(error, "Browser blocked playback.");
      setLastErrorMessage(message);
      setMode("gate");
    }
  }, [attachSource, clearRetry, scheduleRetry, videoRef]);

  const handleManualPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || manualPlayInFlightRef.current) return;
    manualPlayInFlightRef.current = true;
    setMode("idle");

    clearRetry();
    backoffRef.current = START_BACKOFF;

    try {
      if (!hlsRef.current) {
        throw new Error("HLS player is not ready.");
      }
      attachSource();
      setLastErrorMessage(null);
      await video.play();
    } catch (error) {
      const message = getErrorMessage(error, "Browser blocked playback.");
      setLastErrorMessage(message);
      setMode("gate");
    } finally {
      manualPlayInFlightRef.current = false;
    }
  }, [attachSource, clearRetry, videoRef]);

  const tapToUnmute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    try {
      video.muted = false;
    } catch {}
    setIsMuted(video.muted);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsMuted(video.muted);

    if ((autoPlay || hasPlayedRef.current) && video.paused && (shouldPreventPause?.() ?? true)) {
      void video.play().catch(() => {});
    }

    const syncMutedState = () => {
      setIsMuted(video.muted);
      setMode((current) => {
        if (current === "playing" && video.muted) return "playing-muted";
        if (current === "playing-muted" && !video.muted) return "playing";
        return current;
      });
    };

    const onPause = () => {
      if (disposedRef.current) return;
      if (!(autoPlay || hasPlayedRef.current)) return;
      if (!(shouldPreventPause?.() ?? true)) return;
      void video.play().catch(() => {});
    };

    video.addEventListener("volumechange", syncMutedState);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("volumechange", syncMutedState);
      video.removeEventListener("pause", onPause);
    };
  }, [autoPlay, keepAlive, shouldPreventPause, videoRef]);

  useEffect(() => {
    disposedRef.current = false;
    hasPlayedRef.current = false;
    manualPlayInFlightRef.current = false;
    setMode("idle");
    setIsMuted(false);
    setPlayerState("INIT");
    setStats({});
    setLastErrorMessage(null);
    metadataEventsRef.current = 0;

    const video = videoRef.current;
    if (!video) return;

    if (!Hls.isSupported()) {
      setMode("unsupported");
      return;
    }

    const hls = new Hls({
      lowLatencyMode: true,
      backBufferLength: 30,
      liveDurationInfinity: true,
    });

    hlsRef.current = hls;
    setPlayerVersion((n) => n + 1);
    hls.attachMedia(video);

    const onMediaAttached = () => {
      try {
        attachSource();
        setLastErrorMessage(null);
      } catch (error) {
        const message = getErrorMessage(error, "Failed to load the playback URL.");
        setLastErrorMessage(message);
        scheduleRetry();
      }

      if (autoPlay) {
        void video.play().catch((error) => {
          const message = getErrorMessage(error, "Browser blocked playback.");
          setLastErrorMessage(message);
          setMode("gate");
        });
      } else {
        setMode("gate");
      }
    };

    const onManifestParsed = () => {
      setPlayerState("READY");
      updateStats();
    };

    const onLevelUpdated = () => {
      updateStats();
    };

    const onMetadataParsed = (
      _event: string,
      data: { samples: Array<{ data: Uint8Array | ArrayBuffer }> },
    ) => {
      let emitted = false;

      for (const sample of data.samples) {
        const rawData =
          sample.data instanceof Uint8Array ? sample.data : new Uint8Array(sample.data);
        const messages = extractMetadataStrings(rawData);

        for (const message of messages) {
          try {
            JSON.parse(message);
            onTextMetadata?.(message);
            console.log(message)
            emitted = true;
          } catch {
            console.log(`Failed Message: ${message}`)
            // Ignore non-JSON ID3 text frames. Playback metadata consumers
            // expect the same JSON payload shape emitted by the IVS player.
          }
        }
      }

      if (emitted) {
        metadataEventsRef.current += 1;
        updateStats();
      }
    };

    const onWaiting = () => {
      setPlayerState("BUFFERING");
      updateStats();
    };

    const onCanPlay = () => {
      setPlayerState(video.paused ? "READY" : "PLAYING");
      updateStats();
    };

    const onPlayingInternal = () => {
      backoffRef.current = START_BACKOFF;
      setMode(video.muted ? "playing-muted" : "playing");
      setPlayerState("PLAYING");
      updateStats();
      hasPlayedRef.current = true;
      manualPlayInFlightRef.current = false;
      setLastErrorMessage(null);
      onPlaying?.();
      setSharedAudioContext(video);
      setIsMuted(video.muted);
    };

    const onEndedInternal = () => {
      setMode("ended");
      setPlayerState("ENDED");
      updateStats();
      onEnded?.();
    };

    const onErrorInternal = (_event: string, data: { details: string; fatal: boolean; error?: Error }) => {
      setPlayerState("ERROR");
      updateStats();
      const message = data.error?.message || data.details || "HLS playback error.";
      setLastErrorMessage(message);

      if (!data.fatal) return;

      switch (data.details) {
        case Hls.ErrorDetails.MANIFEST_LOAD_ERROR:
        case Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT:
        case Hls.ErrorDetails.LEVEL_LOAD_ERROR:
        case Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT:
        case Hls.ErrorDetails.FRAG_LOAD_ERROR:
        case Hls.ErrorDetails.FRAG_LOAD_TIMEOUT:
          scheduleRetry();
          break;
        default:
          setMode("gate");
      }
    };

    hls.on(Hls.Events.MEDIA_ATTACHED, onMediaAttached);
    hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
    hls.on(Hls.Events.LEVEL_UPDATED, onLevelUpdated);
    hls.on(Hls.Events.FRAG_PARSING_METADATA, onMetadataParsed);
    hls.on(Hls.Events.ERROR, onErrorInternal);

    video.addEventListener("playing", onPlayingInternal);
    video.addEventListener("ended", onEndedInternal);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("canplaythrough", onCanPlay);

    return () => {
      disposedRef.current = true;
      clearRetry();
      video.removeEventListener("playing", onPlayingInternal);
      video.removeEventListener("ended", onEndedInternal);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("canplaythrough", onCanPlay);
      hls.off(Hls.Events.MEDIA_ATTACHED, onMediaAttached);
      hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      hls.off(Hls.Events.LEVEL_UPDATED, onLevelUpdated);
      hls.off(Hls.Events.FRAG_PARSING_METADATA, onMetadataParsed);
      hls.off(Hls.Events.ERROR, onErrorInternal);
      hls.destroy();
      hlsRef.current = null;
    };
  }, [attachSource, autoPlay, clearRetry, onEnded, onPlaying, onTextMetadata, scheduleRetry, updateStats, videoRef]);

  return {
    playerRef: hlsRef,
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
    handleManualPlay,
    tapToUnmute,
  };
}
