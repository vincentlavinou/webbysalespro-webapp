"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Player, PlayerError, Quality, TextMetadataCue } from "amazon-ivs-player";
import {
  emitPlaybackEnded,
  emitPlaybackMetadata,
  emitPlaybackPlaying,
} from "@/emitter/playback";

type Props = {
  src: string;
  poster?: string;
  showStats?: boolean;
  ariaLabel?: string;
  title?: string;
  artwork?: MediaImage[];
  keepAlive?: boolean;
};

type PlaybackMode =
  | "idle"
  | "buffering"
  | "playing"
  | "playing-muted"
  | "blocked"
  | "ended"
  | "unsupported"
  | "error";

export default function AndroidWebbySalesProPlayer({
  src,
  poster,
  showStats = false,
  ariaLabel = "WebbySalesPro player",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qualityName, setQualityName] = useState<string | null>(null);
  const [syncTimeMs, setSyncTimeMs] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    let isDisposed = false;
    let detach: (() => void) | undefined;

    const setupPlayer = async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        const IVSPlayer = await import("amazon-ivs-player");
        if (isDisposed) return;

        if (!IVSPlayer.isPlayerSupported) {
          setMode("unsupported");
          return;
        }

        const player = IVSPlayer.create({
          wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
          wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
        });

        playerRef.current = player;

        video.muted = true;
        video.autoplay = true;
        video.playsInline = true;

        player.attachHTMLVideoElement(video);
        player.setAutoplay(true);
        player.setMuted(true);
        player.setAutoQualityMode(true);
        player.setLiveLowLatencyEnabled(true);
        player.setRebufferToLive(true);

        const onReady = () => {
          setErrorMessage(null);
          setMode("idle");
        };

        const onPlaying = () => {
          setErrorMessage(null);
          setIsMuted(video.muted);
          setMode(video.muted ? "playing-muted" : "playing");
          emitPlaybackPlaying();
        };

        const onBuffering = () => {
          setMode("buffering");
        };

        const onEnded = () => {
          setMode("ended");
          emitPlaybackEnded();
        };

        const onPlaybackBlocked = () => {
          setMode("blocked");
        };

        const onAudioBlocked = () => {
          setMode("blocked");
          setIsMuted(true);
        };

        const onMutedChanged = () => {
          setIsMuted(video.muted);
          setMode(video.muted ? "playing-muted" : "playing");
        };

        const onQualityChanged = (quality?: Quality) => {
          setQualityName(quality?.name ?? null);
        };

        const onSyncTimeUpdate = (syncTime: number) => {
          setSyncTimeMs(syncTime);
        };

        const onMetadata = (cue: TextMetadataCue) => {
          emitPlaybackMetadata(cue.text);
        };

        const onError = (error: PlayerError) => {
          setErrorMessage(
            error?.message || `${error?.source ?? "IVS"} error ${error?.code ?? ""}`.trim(),
          );
          setMode("error");
        };

        player.addEventListener(IVSPlayer.PlayerState.READY, onReady);
        player.addEventListener(IVSPlayer.PlayerState.PLAYING, onPlaying);
        player.addEventListener(IVSPlayer.PlayerState.BUFFERING, onBuffering);
        player.addEventListener(IVSPlayer.PlayerState.ENDED, onEnded);
        player.addEventListener(IVSPlayer.PlayerEventType.REBUFFERING, onBuffering);
        player.addEventListener(IVSPlayer.PlayerEventType.PLAYBACK_BLOCKED, onPlaybackBlocked);
        player.addEventListener(IVSPlayer.PlayerEventType.AUDIO_BLOCKED, onAudioBlocked);
        player.addEventListener(IVSPlayer.PlayerEventType.MUTED_CHANGED, onMutedChanged);
        player.addEventListener(IVSPlayer.PlayerEventType.QUALITY_CHANGED, onQualityChanged);
        player.addEventListener(IVSPlayer.PlayerEventType.SYNC_TIME_UPDATE, onSyncTimeUpdate);
        player.addEventListener(IVSPlayer.PlayerEventType.TEXT_METADATA_CUE, onMetadata);
        player.addEventListener(IVSPlayer.PlayerEventType.ERROR, onError);

        detach = () => {
          player.removeEventListener(IVSPlayer.PlayerState.READY, onReady);
          player.removeEventListener(IVSPlayer.PlayerState.PLAYING, onPlaying);
          player.removeEventListener(IVSPlayer.PlayerState.BUFFERING, onBuffering);
          player.removeEventListener(IVSPlayer.PlayerState.ENDED, onEnded);
          player.removeEventListener(IVSPlayer.PlayerEventType.REBUFFERING, onBuffering);
          player.removeEventListener(IVSPlayer.PlayerEventType.PLAYBACK_BLOCKED, onPlaybackBlocked);
          player.removeEventListener(IVSPlayer.PlayerEventType.AUDIO_BLOCKED, onAudioBlocked);
          player.removeEventListener(IVSPlayer.PlayerEventType.MUTED_CHANGED, onMutedChanged);
          player.removeEventListener(IVSPlayer.PlayerEventType.QUALITY_CHANGED, onQualityChanged);
          player.removeEventListener(IVSPlayer.PlayerEventType.SYNC_TIME_UPDATE, onSyncTimeUpdate);
          player.removeEventListener(IVSPlayer.PlayerEventType.TEXT_METADATA_CUE, onMetadata);
          player.removeEventListener(IVSPlayer.PlayerEventType.ERROR, onError);
        };

        player.load(src);

        try {
          await player.play();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Android Chrome blocked autoplay.";
          setErrorMessage(message);
          setMode("blocked");
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to initialize the IVS player.";
        setErrorMessage(message);
        setMode("error");
      }
    };

    void setupPlayer();

    return () => {
      isDisposed = true;
      detach?.();
      playerRef.current?.delete();
      playerRef.current = null;
    };
  }, [src]);

  const handleStartWithSound = async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.setMuted(false);
      setIsMuted(false);
      await player.play();
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Playback could not start with sound.";
      setErrorMessage(message);
      setMode("blocked");
    }
  };

  const handleUnmute = async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.setMuted(false);
      setIsMuted(false);
      await player.play();
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Playback could not resume with sound.";
      setErrorMessage(message);
    }
  };

  if (mode === "unsupported") {
    return (
      <div className="w-full">
        <div className="relative overflow-hidden border bg-black shadow-sm">
          <div className="aspect-video">
            <video
              src={src}
              poster={poster}
              playsInline
              controls
              preload="auto"
              aria-label={ariaLabel}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>
    );
  }

  const showStartButton = mode === "blocked";
  const showUnmuteButton = mode === "playing-muted" && isMuted;
  const showLoading = mode === "idle" || mode === "buffering";

  return (
    <div className="w-full">
      <div className="relative overflow-hidden border bg-black shadow-sm" style={{ touchAction: "manipulation" }}>
        <div className="aspect-video">
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            preload="auto"
            aria-label={ariaLabel}
            className="h-full w-full object-contain"
          />
        </div>

        {showLoading && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            <p className="text-xs font-medium uppercase tracking-wide text-white/80">
              {mode === "buffering" ? "Connecting to live webinar…" : "Preparing live webinar…"}
            </p>
          </div>
        )}

        {showStartButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => void handleStartWithSound()}
              className="rounded-full bg-white/95 px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Tap to start with sound
            </button>
          </div>
        )}

        {showUnmuteButton && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={() => void handleUnmute()}
              className="rounded-full bg-black/80 px-5 py-3 text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              Tap to unmute
            </button>
          </div>
        )}

        {mode === "ended" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="rounded-md bg-black/70 px-3 py-2 text-sm font-medium text-white">
              This live webinar has ended.
            </div>
          </div>
        )}

        {errorMessage && mode === "error" && (
          <div className="absolute inset-x-4 bottom-4 rounded-md bg-red-950/85 px-3 py-2 text-xs text-red-50 backdrop-blur-sm">
            Playback error: {errorMessage}
          </div>
        )}

        {showStats && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <div>Mode: {mode}</div>
            <div>Muted: {String(isMuted)}</div>
            <div>Quality: {qualityName ?? "..."}</div>
            <div>Sync: {typeof syncTimeMs === "number" ? `${Math.round(syncTimeMs)}ms` : "..."}</div>
          </div>
        )}
      </div>
    </div>
  );
}
