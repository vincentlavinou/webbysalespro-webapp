"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Player,
  PlayerError,
  PlayerState,
  Quality,
  TextMetadataCue,
} from "amazon-ivs-player";

export type AndroidPlaybackMode =
  | "idle"
  | "loading"
  | "ready"
  | "buffering"
  | "playing"
  | "playing-muted"
  | "blocked"
  | "ended"
  | "unsupported"
  | "error";

const RESTORE_COOLDOWN_MS = 3000;
const FORCE_RELOAD_COOLDOWN_MS = 1500;

type Options = {
  src: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onTextMetadata?: (text: string) => void;
  onEnded?: () => void;
  onPlaying?: () => void;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function useAndroidIvsPlayerCore({
  src,
  videoRef,
  onTextMetadata,
  onEnded,
  onPlaying,
}: Options) {
  const playerRef = useRef<Player | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const lastRestoreRef = useRef(0);
  const lastForcedReloadRef = useRef(0);

  const [mode, setMode] = useState<AndroidPlaybackMode>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qualityName, setQualityName] = useState<string | null>(null);
  const [syncTimeMs, setSyncTimeMs] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  const seekHtmlVideoToLive = useCallback((video: HTMLVideoElement) => {
    try {
      const seekable = video.seekable;
      if (seekable.length > 0) {
        video.currentTime = seekable.end(seekable.length - 1);
        return true;
      }
    } catch {
      // noop
    }

    try {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration;
        return true;
      }
    } catch {
      // noop
    }

    return false;
  }, []);

  const seekPlayerToLive = useCallback((player: Player) => {
    try {
      if (typeof player.getDuration === "function" && typeof player.seekTo === "function") {
        const duration = player.getDuration();
        if (Number.isFinite(duration) && duration > 0) {
          player.seekTo(duration);
          return true;
        }
      }
    } catch {
      // noop
    }

    return false;
  }, []);

  const reloadPlayer = useCallback(async () => {
    const player = playerRef.current;
    const video = videoRef.current;
    if (!video) return;

    setErrorMessage(null);
    setMode("buffering");

    if (player) {
      player.load(src);
    } else {
      video.load();
      seekHtmlVideoToLive(video);
    }

    await video.play();
  }, [seekHtmlVideoToLive, src, videoRef]);

  useEffect(() => {
    let cancelled = false;

    const cleanup = () => {
      detachRef.current?.();
      detachRef.current = null;

      if (playerRef.current) {
        try {
          playerRef.current.delete();
        } catch {
          // noop
        }
        playerRef.current = null;
      }
    };

    const setupPlayer = async () => {
      const video = videoRef.current;
      if (!video || !src) return;

      cleanup();

      setMode("loading");
      setErrorMessage(null);
      setQualityName(null);
      setSyncTimeMs(null);
      setIsMuted(true);

      try {
        const IVSPlayer = await import("amazon-ivs-player");
        if (cancelled) return;

        if (!IVSPlayer.isPlayerSupported) {
          setMode("unsupported");
          return;
        }

        const player = IVSPlayer.create({
          wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
          wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
        });

        playerRef.current = player;

        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        video.preload = "auto";

        player.attachHTMLVideoElement(video);

        player.setAutoplay(true);
        player.setMuted(true);
        player.setAutoQualityMode(true);
        player.setLiveLowLatencyEnabled(true);

        if (typeof player.setRebufferToLive === "function") {
          player.setRebufferToLive(true);
        }

        const updateMutedState = () => {
          const muted = video.muted;
          setIsMuted(muted);

          setMode((current) => {
            if (
              current === "ended" ||
              current === "error" ||
              current === "blocked"
            ) {
              return current;
            }

            return muted ? "playing-muted" : "playing";
          });
        };

        const onReady = () => {
          setErrorMessage(null);
          setMode("ready");
          console.log("[IVS] READY");
        };

        const onPlayingInternal = () => {
          setErrorMessage(null);
          setIsMuted(video.muted);
          setMode(video.muted ? "playing-muted" : "playing");
          onPlaying?.();
          console.log("[IVS] PLAYING");
        };

        const onBuffering = () => {
          setMode((current) => {
            if (
              current === "blocked" ||
              current === "ended" ||
              current === "error"
            ) {
              return current;
            }

            return "buffering";
          });
          console.log("[IVS] BUFFERING");
        };

        const onEndedInternal = () => {
          setMode("ended");
          onEnded?.();
          console.log("[IVS] ENDED");
        };

        const onPlaybackBlocked = () => {
          setMode("blocked");
          setErrorMessage("Autoplay was blocked on this device/browser.");
          console.warn("[IVS] PLAYBACK_BLOCKED");
        };

        const onAudioBlocked = () => {
          setMode("blocked");
          setIsMuted(true);
          setErrorMessage("Playback with sound was blocked until user interaction.");
          console.warn("[IVS] AUDIO_BLOCKED");
        };

        const onMutedChanged = () => {
          updateMutedState();
          console.log("[IVS] MUTED_CHANGED", { muted: video.muted });
        };

        const onQualityChanged = (quality?: Quality) => {
          setQualityName(quality?.name ?? null);
          console.log("[IVS] QUALITY_CHANGED", quality?.name);
        };

        const onSyncTimeUpdate = (syncTime: number) => {
          setSyncTimeMs(syncTime);
        };

        const onMetadataInternal = (cue: TextMetadataCue) => {
          onTextMetadata?.(cue.text);
          console.log("[IVS] TEXT_METADATA_CUE", cue.text);
        };

        const onError = (error: PlayerError) => {
          const message =
            error?.message ||
            `${error?.source ?? "IVS"} error ${error?.code ?? ""}`.trim() ||
            "Unknown IVS playback error.";

          setErrorMessage(message);
          setMode("error");
          console.error("[IVS] ERROR", error);
        };

        player.addEventListener(IVSPlayer.PlayerState.READY, onReady);
        player.addEventListener(IVSPlayer.PlayerState.PLAYING, onPlayingInternal);
        player.addEventListener(IVSPlayer.PlayerState.BUFFERING, onBuffering);
        player.addEventListener(IVSPlayer.PlayerState.ENDED, onEndedInternal);
        player.addEventListener(IVSPlayer.PlayerEventType.REBUFFERING, onBuffering);
        player.addEventListener(
          IVSPlayer.PlayerEventType.PLAYBACK_BLOCKED,
          onPlaybackBlocked
        );
        player.addEventListener(
          IVSPlayer.PlayerEventType.AUDIO_BLOCKED,
          onAudioBlocked
        );
        player.addEventListener(
          IVSPlayer.PlayerEventType.MUTED_CHANGED,
          onMutedChanged
        );
        player.addEventListener(
          IVSPlayer.PlayerEventType.QUALITY_CHANGED,
          onQualityChanged
        );
        player.addEventListener(
          IVSPlayer.PlayerEventType.SYNC_TIME_UPDATE,
          onSyncTimeUpdate
        );
        player.addEventListener(
          IVSPlayer.PlayerEventType.TEXT_METADATA_CUE,
          onMetadataInternal
        );
        player.addEventListener(IVSPlayer.PlayerEventType.ERROR, onError);

        detachRef.current = () => {
          player.removeEventListener(IVSPlayer.PlayerState.READY, onReady);
          player.removeEventListener(
            IVSPlayer.PlayerState.PLAYING,
            onPlayingInternal
          );
          player.removeEventListener(
            IVSPlayer.PlayerState.BUFFERING,
            onBuffering
          );
          player.removeEventListener(IVSPlayer.PlayerState.ENDED, onEndedInternal);
          player.removeEventListener(
            IVSPlayer.PlayerEventType.REBUFFERING,
            onBuffering
          );
          player.removeEventListener(
            IVSPlayer.PlayerEventType.PLAYBACK_BLOCKED,
            onPlaybackBlocked
          );
          player.removeEventListener(
            IVSPlayer.PlayerEventType.AUDIO_BLOCKED,
            onAudioBlocked
          );
          player.removeEventListener(
            IVSPlayer.PlayerEventType.MUTED_CHANGED,
            onMutedChanged
          );
          player.removeEventListener(
            IVSPlayer.PlayerEventType.QUALITY_CHANGED,
            onQualityChanged
          );
          player.removeEventListener(
            IVSPlayer.PlayerEventType.SYNC_TIME_UPDATE,
            onSyncTimeUpdate
          );
          player.removeEventListener(
            IVSPlayer.PlayerEventType.TEXT_METADATA_CUE,
            onMetadataInternal
          );
          player.removeEventListener(IVSPlayer.PlayerEventType.ERROR, onError);
        };

        player.load(src);
      } catch (error) {
        const message = getErrorMessage(
          error,
          "Failed to initialize the IVS player."
        );
        setErrorMessage(message);
        setMode("error");
        console.error("[IVS] setup error", error);
      }
    };

    void setupPlayer();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [onEnded, onPlaying, onTextMetadata, src, videoRef]);

  const restoreToLive = useCallback(async (options?: {
    forceReload?: boolean;
    gracePeriodMs?: number;
  }) => {
    const player = playerRef.current;
    const video = videoRef.current;
    if (!video) return;

    const now = Date.now();
    const forceReload = options?.forceReload ?? false;

    if (forceReload) {
      if (now - lastForcedReloadRef.current < FORCE_RELOAD_COOLDOWN_MS) return;
      lastForcedReloadRef.current = now;

      try {
        await reloadPlayer();
      } catch (error) {
        setErrorMessage(getErrorMessage(error, "Playback could not reload."));
        setMode("blocked");
      }
      return;
    }

    if (now - lastRestoreRef.current < RESTORE_COOLDOWN_MS) return;
    lastRestoreRef.current = now;

    if (options?.gracePeriodMs && options.gracePeriodMs > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, options.gracePeriodMs));
    }

    try {
      if (player) {
        const playerState = player.getState?.() as PlayerState | undefined;
        if (playerState === "PLAYING" || playerState === "BUFFERING" || playerState === "READY") {
          seekPlayerToLive(player);
          await video.play();
          setErrorMessage(null);
          return;
        }
      } else {
        seekHtmlVideoToLive(video);
        await video.play();
        setErrorMessage(null);
        return;
      }

      await reloadPlayer();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Playback could not resume."));
      setMode("blocked");
    }
  }, [reloadPlayer, seekHtmlVideoToLive, seekPlayerToLive, videoRef]);

  const handleStartMuted = () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.setMuted(true);
      setIsMuted(true);
      setErrorMessage(null);
      player.play();
      setMode("buffering");
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Playback could not start."));
      setMode("blocked");
    }
  };

  const handleStartWithSound = () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.setMuted(false);
      setIsMuted(false);
      setErrorMessage(null);
      player.play();
      setMode("buffering");
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Playback could not start with sound.")
      );
      setMode("blocked");
    }
  };

  const handleUnmute = () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.setMuted(false);
      setIsMuted(false);
      setErrorMessage(null);
      player.play();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Playback could not resume with sound.")
      );
    }
  };

  return {
    playerRef,
    mode,
    errorMessage,
    qualityName,
    syncTimeMs,
    isMuted,
    handleStartMuted,
    handleStartWithSound,
    handleUnmute,
    restoreToLive,
  };
}
