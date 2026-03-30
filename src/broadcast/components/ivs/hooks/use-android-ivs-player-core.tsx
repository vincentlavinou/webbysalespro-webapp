"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Player,
  PlayerError,
  PlayerState,
  TextMetadataCue,
} from "amazon-ivs-player";
import { PlayerEventType } from "amazon-ivs-player";
import { setSharedAudioContext } from "@/chat/hooks/use-cta-announcements";
import type { PlayerMode } from "./use-ivs-player-core";

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
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return fallback;
}

function logAndroidIvs(event: string, details?: Record<string, unknown>) {
  if (details) {
    console.log("[Android IVS]", event, details);
    return;
  }

  console.log("[Android IVS]", event);
}

export function useAndroidIvsPlayerCore({
  src,
  autoPlay,
  videoRef,
  onTextMetadata,
  onEnded,
  onPlaying,
  keepAlive = false,
  shouldPreventPause,
}: Options) {
  const playerRef = useRef<Player | null>(null);
  const disposedRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const manualPlayInFlightRef = useRef(false);
  const startupWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [mode, setMode] = useState<PlayerMode>("idle");
  const [stats, setStats] = useState<StatsState>({});
  const [playerState, setPlayerState] = useState<PlayerState | "INIT">("INIT");
  const [isMuted, setIsMuted] = useState(false);
  const [playerVersion, setPlayerVersion] = useState(0);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);

  const clearStartupWatchdog = useCallback(() => {
    if (!startupWatchdogRef.current) return;
    clearTimeout(startupWatchdogRef.current);
    startupWatchdogRef.current = null;
  }, []);

  const armStartupWatchdog = useCallback((reason: string) => {
    clearStartupWatchdog();
    startupWatchdogRef.current = setTimeout(() => {
      const player = playerRef.current;
      const video = videoRef.current;
      logAndroidIvs("watchdog:startupStalled", {
        reason,
        manualPlayInFlight: manualPlayInFlightRef.current,
        hasPlayed: hasPlayedRef.current,
        mode,
        playerState: player?.getState?.(),
        readyState: video?.readyState,
        networkState: video?.networkState,
        paused: video?.paused,
        currentTime: video?.currentTime,
        muted: video?.muted,
      });
    }, 4000);
  }, [clearStartupWatchdog, mode, videoRef]);

  const updateStats = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    try {
      const state = player.getState();
      logAndroidIvs("updateStats", {
        state,
        latency: player.getLiveLatency(),
        quality: player.getQuality()?.name ?? null,
      });
      setPlayerState(state);
      setStats({
        latency: player.getLiveLatency(),
        bitrate: Math.round((player.getQuality()?.bitrate ?? 0) / 1000) || undefined,
        resolution: `${player.getDisplayWidth()}x${player.getDisplayHeight()}`,
        state,
      });
    } catch {}
  }, []);

  const restoreToLive = useCallback(async (options?: { forceReload?: boolean }) => {
    const player = playerRef.current;
    const video = videoRef.current;
    if (!player || !video || disposedRef.current) return;

    try {
      const state = player.getState();
      logAndroidIvs("restoreToLive:start", {
        forceReload: Boolean(options?.forceReload),
        playerState: state,
        paused: video.paused,
        readyState: video.readyState,
      });
      if (options?.forceReload || state === "Idle") {
        setMode("idle");
        logAndroidIvs("restoreToLive:loadSource", { src });
        player.load(src);
      }

      await video.play();
      clearStartupWatchdog();
      logAndroidIvs("restoreToLive:playResolved", {
        playerState: player.getState(),
        paused: video.paused,
        readyState: video.readyState,
      });
      setLastErrorMessage(null);
    } catch (error) {
      const message = getErrorMessage(error, "Browser blocked playback.");
      logAndroidIvs("restoreToLive:playRejected", {
        message,
        playerState: player.getState(),
        paused: video.paused,
        readyState: video.readyState,
      });
      console.warn("Android IVS restore failed:", message, error);
      setLastErrorMessage(message);
      setMode("gate");
    }
  }, [clearStartupWatchdog, src, videoRef]);

  const handleManualPlay = useCallback(async () => {
    const player = playerRef.current;
    const video = videoRef.current;
    if (!player || !video || manualPlayInFlightRef.current) return;

    manualPlayInFlightRef.current = true;
    armStartupWatchdog("manualPlay");
    const state = player.getState();
    logAndroidIvs("manualPlay:start", {
      playerState: state,
      paused: video.paused,
      readyState: video.readyState,
      networkState: video.networkState,
    });

    setMode("idle");

    try {
      if (state === "Idle") {
        logAndroidIvs("manualPlay:loadSource", { src });
        player.load(src);
      } else {
        logAndroidIvs("manualPlay:skipLoad", { playerState: state });
      }
      await video.play();
      logAndroidIvs("manualPlay:playResolved", {
        playerState: player.getState(),
        paused: video.paused,
        readyState: video.readyState,
      });
      setLastErrorMessage(null);
    } catch (error) {
      const message = getErrorMessage(error, "Browser blocked playback.");
      logAndroidIvs("manualPlay:playRejected", {
        message,
        playerState: player.getState(),
        paused: video.paused,
        readyState: video.readyState,
      });
      console.warn("Android IVS manual play failed:", message, error);
      setLastErrorMessage(message);
      setMode("gate");
    } finally {
      manualPlayInFlightRef.current = false;
    }
  }, [armStartupWatchdog, src, videoRef]);

  const tapToUnmute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    try {
      video.muted = false;
    } catch {}

    setIsMuted(video.muted);
    setMode(video.muted ? "playing-muted" : "playing");
    logAndroidIvs("tapToUnmute", { muted: video.muted });
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const syncMutedState = () => {
      logAndroidIvs("video:volumechange", { muted: video.muted, volume: video.volume });
      setIsMuted(video.muted);
      setMode(current => {
        if (current === "playing" && video.muted) return "playing-muted";
        if (current === "playing-muted" && !video.muted) return "playing";
        return current;
      });
    };

    const onPause = () => {
      logAndroidIvs("video:pause", {
        paused: video.paused,
        readyState: video.readyState,
        currentTime: video.currentTime,
      });
      if (disposedRef.current) return;
      if (!keepAlive) return;
      if (!(shouldPreventPause?.() ?? true)) return;
      if (!hasPlayedRef.current) return;
      video.play().catch(() => {});
    };

    const onPlay = () => {
      logAndroidIvs("video:play", {
        paused: video.paused,
        readyState: video.readyState,
        currentTime: video.currentTime,
      });
    };

    const onPlaying = () => {
      clearStartupWatchdog();
      logAndroidIvs("video:playing", {
        paused: video.paused,
        readyState: video.readyState,
        currentTime: video.currentTime,
      });
    };

    const onWaiting = () => {
      logAndroidIvs("video:waiting", {
        paused: video.paused,
        readyState: video.readyState,
        currentTime: video.currentTime,
      });
    };

    const onLoadedMetadata = () => {
      logAndroidIvs("video:loadedmetadata", {
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
      });
    };

    video.addEventListener("volumechange", syncMutedState);
    video.addEventListener("pause", onPause);
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      video.removeEventListener("volumechange", syncMutedState);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [clearStartupWatchdog, keepAlive, shouldPreventPause, videoRef]);

  useEffect(() => {
    logAndroidIvs("hook:mount", { src });
    disposedRef.current = false;
    hasPlayedRef.current = false;
    manualPlayInFlightRef.current = false;
    setMode("idle");
    setStats({});
    setPlayerState("INIT");
    setIsMuted(false);
    setLastErrorMessage(null);

    let player: Player | null = null;
    let removeListeners = () => {};

    (async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        const ivs = await import("amazon-ivs-player");
        if (disposedRef.current) return;

        if (!ivs.isPlayerSupported) {
          logAndroidIvs("init:unsupported");
          console.warn("IVS Player not supported on this Android browser.");
          setMode("unsupported");
          return;
        }

        player = ivs.create({
          wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
          wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
        });

        playerRef.current = player;
        player.attachHTMLVideoElement(video);
        logAndroidIvs("init:attachedVideo", {
          autoplay: autoPlay,
          readyState: video.readyState,
          muted: video.muted,
        });
        player.setAutoplay(autoPlay);
        player.setAutoQualityMode(true);
        player.setLiveLowLatencyEnabled(true);
        player.setRebufferToLive(true);
        setPlayerVersion(current => current + 1);

        const handleReady = () => {
          logAndroidIvs("ivs:READY", { playerState: player?.getState() });
          updateStats();

          if (manualPlayInFlightRef.current) {
            logAndroidIvs("ivs:READY:manualPlayInFlight", {
              paused: video.paused,
              readyState: video.readyState,
            });

            setMode(video.muted ? "playing-muted" : "playing");

            if (video.paused) {
              void video.play().catch((error) => {
                const message = getErrorMessage(error, "Browser blocked playback.");
                logAndroidIvs("ivs:READY:playRejected", {
                  message,
                  playerState: player?.getState(),
                  paused: video.paused,
                  readyState: video.readyState,
                });
                setLastErrorMessage(message);
                setMode("gate");
                manualPlayInFlightRef.current = false;
              });
            }
            return;
          }

          setMode(current => (current === "idle" ? "gate" : current));
        };

        const handleBuffering = () => {
          clearStartupWatchdog();
          logAndroidIvs("ivs:BUFFERING", { playerState: player?.getState() });
          setMode(video.muted ? "playing-muted" : "playing");
          setPlayerState(ivs.PlayerState.BUFFERING);
          updateStats();
        };

        const handleIdle = () => {
          logAndroidIvs("ivs:IDLE", { playerState: player?.getState() });
          setPlayerState(ivs.PlayerState.IDLE);
          updateStats();
        };

        const handlePlaying = () => {
          clearStartupWatchdog();
          logAndroidIvs("ivs:PLAYING", {
            playerState: player?.getState(),
            paused: video.paused,
            readyState: video.readyState,
            muted: video.muted,
          });
          hasPlayedRef.current = true;
          manualPlayInFlightRef.current = false;
          setLastErrorMessage(null);
          setIsMuted(video.muted);
          setMode(video.muted ? "playing-muted" : "playing");
          updateStats();
          onPlaying?.();
          setSharedAudioContext(video);
        };

        const handleEnded = () => {
          clearStartupWatchdog();
          logAndroidIvs("ivs:ENDED", { playerState: player?.getState() });
          setMode("ended");
          updateStats();
          onEnded?.();
        };

        const handleError = (error: PlayerError) => {
          clearStartupWatchdog();
          updateStats();
          const message = error?.message || `${error?.source ?? "IVS"} error ${error?.code ?? ""}`.trim();
          logAndroidIvs("ivs:ERROR", {
            message,
            code: error?.code,
            source: error?.source,
            type: error?.type,
            playerState: player?.getState(),
          });
          console.warn("Android IVS player error:", error);
          setLastErrorMessage(message);
          if (!hasPlayedRef.current) setMode("gate");
        };

        const handleMetadata = (payload: TextMetadataCue) => {
          logAndroidIvs("ivs:TEXT_METADATA_CUE", { text: payload.text });
          try {
            onTextMetadata?.(payload.text);
          } catch {}
        };

        player.addEventListener(ivs.PlayerState.READY, handleReady);
        player.addEventListener(ivs.PlayerState.BUFFERING, handleBuffering);
        player.addEventListener(ivs.PlayerState.IDLE, handleIdle);
        player.addEventListener(ivs.PlayerState.PLAYING, handlePlaying);
        player.addEventListener(ivs.PlayerState.ENDED, handleEnded);
        player.addEventListener(PlayerEventType.ERROR, handleError);
        player.addEventListener(PlayerEventType.TEXT_METADATA_CUE, handleMetadata);

        removeListeners = () => {
          player?.removeEventListener(ivs.PlayerState.READY, handleReady);
          player?.removeEventListener(ivs.PlayerState.BUFFERING, handleBuffering);
          player?.removeEventListener(ivs.PlayerState.IDLE, handleIdle);
          player?.removeEventListener(ivs.PlayerState.PLAYING, handlePlaying);
          player?.removeEventListener(ivs.PlayerState.ENDED, handleEnded);
          player?.removeEventListener(PlayerEventType.ERROR, handleError);
          player?.removeEventListener(PlayerEventType.TEXT_METADATA_CUE, handleMetadata);
        };

        logAndroidIvs("init:loadSource", { src });
        player.load(src);
        setPlayerState("INIT");
        setMode(autoPlay ? "idle" : "gate");

        if (autoPlay) {
          try {
            await video.play();
            logAndroidIvs("init:autoplayResolved", {
              playerState: player.getState(),
              paused: video.paused,
              readyState: video.readyState,
            });
          } catch (error) {
            const message = getErrorMessage(error, "Browser blocked playback.");
            logAndroidIvs("init:autoplayRejected", {
              message,
              playerState: player.getState(),
              paused: video.paused,
              readyState: video.readyState,
            });
            console.warn("Android IVS autoplay failed:", message, error);
            setLastErrorMessage(message);
            setMode("gate");
          }
        }

      } catch (error) {
        const message = getErrorMessage(error, "Failed to initialize the IVS player.");
        logAndroidIvs("init:failed", { message });
        console.warn("Android IVS initialization failed:", message, error);
        setLastErrorMessage(message);
        setMode("unsupported");
      }
    })();

    return () => {
      logAndroidIvs("hook:unmount", { src });
      disposedRef.current = true;
      clearStartupWatchdog();
      removeListeners();

      try {
        player?.pause();
        player?.delete();
      } catch {}

      playerRef.current = null;
    };
  }, [autoPlay, clearStartupWatchdog, onEnded, onPlaying, onTextMetadata, src, updateStats, videoRef]);

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
    restoreToLive,
    handleManualPlay,
    tapToUnmute,
  };
}
