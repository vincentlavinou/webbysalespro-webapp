"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import type { MediaPlayer } from "amazon-ivs-player";
import type { PlaybackStatus } from "@/playback/context/PlaybackRuntimeContext";
import { usePersistentAndroidPlayback } from "@/playback/persistent/use-persistent-android-playback";
import { useFullscreen } from "./hooks/use-fullscreen";
import { useSyncPlaybackStatus } from "./hooks/use-sync-playback-status";
import type { WebbySalesProPlayerHandle } from "./WebbySalesProPlayer";

type Props = {
  src: string;
  poster?: string;
  showStats?: boolean;
  ariaLabel?: string;
  title?: string;
  artwork?: MediaImage[];
  keepAlive?: boolean;
  onPlaybackStatusChange?: (status: PlaybackStatus) => void;
};

export const AndroidWebbySalesProPlayer =
  forwardRef<WebbySalesProPlayerHandle, Props>(function AndroidWebbySalesProPlayer(
    {
      src,
      poster,
      showStats = false,
      ariaLabel = "WebbySalesPro player",
      onPlaybackStatusChange,
    }: Props,
    ref,
  ) {
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const playerSurfaceRef = useRef<HTMLDivElement>(null);

    const {
      videoRef,
      hiddenHostRef,
      mode,
      errorMessage,
      qualityName,
      syncTimeMs,
      isMuted,
      handleStartMuted,
      handleStartWithSound,
      handleUnmute,
      restoreToLive,
    } = usePersistentAndroidPlayback();

    const { enterFullscreen, exitFullscreen, isFullscreen } = useFullscreen({
      videoRef,
      containerRef: playerSurfaceRef,
      onResumeNeeded: () => {
        void restoreToLive({ gracePeriodMs: 150 });
      },
    });

    // Move the persistent <video> into our visible container on mount.
    // On unmount, return it to the hidden host — the player keeps playing.
    useLayoutEffect(() => {
      const video = videoRef.current;
      const container = videoContainerRef.current;
      const host = hiddenHostRef.current;
      if (!video || !container) return;

      if (poster) video.poster = poster;
      video.setAttribute("aria-label", ariaLabel);
      video.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;";
      container.appendChild(video);

      return () => {
        video.style.cssText =
          "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
        host?.appendChild(video);
      };
    }, [videoRef, hiddenHostRef, poster, ariaLabel]);

    // When IVS is unsupported on this device, switch the persistent video
    // element to native HLS playback with browser controls.
    useEffect(() => {
      const video = videoRef.current;
      if (!video || mode !== "unsupported") return;
      video.src = src;
      video.controls = true;
    }, [mode, src, videoRef]);

    useImperativeHandle(
      ref,
      () => ({
        restoreToLive,
        enterFullscreen,
        exitFullscreen,
      }),
      [enterFullscreen, exitFullscreen, restoreToLive],
    );

    useSyncPlaybackStatus({
      kind: "android",
      mode,
      onPlaybackStatusChange,
    });

    const showBlockedStart = mode === "blocked";
    const showUnmuteButton = mode === "playing-muted" && isMuted;
    const showLoading =
      mode === "idle" ||
      mode === "loading" ||
      mode === "ready" ||
      mode === "buffering";

    return (
      <div className="w-full">
        <div
          ref={playerSurfaceRef}
          className="relative overflow-hidden border bg-black shadow-sm"
          style={{ touchAction: "manipulation" }}
        >
          <div className={isFullscreen ? "h-full min-h-screen" : "aspect-video"}>
            {/* video is reparented here via useLayoutEffect */}
            <div
              ref={videoContainerRef}
              className="relative h-full w-full"
            />
          </div>

          {showLoading && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
              <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                {mode === "buffering"
                  ? "Connecting to live webinar…"
                  : "Preparing live webinar…"}
              </p>
            </div>
          )}

          {showBlockedStart && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 backdrop-blur-sm">
              <button
                type="button"
                onClick={handleStartMuted}
                className="rounded-full bg-white/95 px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Tap to start
              </button>

              <button
                type="button"
                onClick={handleStartWithSound}
                className="rounded-full bg-black/80 px-5 py-3 text-sm font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                Tap to start with sound
              </button>
            </div>
          )}

          {showUnmuteButton && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              <button
                type="button"
                onClick={handleUnmute}
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
              <div>
                Sync:{" "}
                {typeof syncTimeMs === "number"
                  ? `${Math.round(syncTimeMs)}ms`
                  : "..."}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });

export function IvsAndroidDebug({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let player: MediaPlayer | undefined;

    const start = async () => {
      console.log("[IVS] mount", { src });

      const video = videoRef.current;
      if (!video) {
        console.log("[IVS] no video element");
        return;
      }

      const IVSPlayer = await import("amazon-ivs-player");
      console.log("[IVS] sdk loaded", { supported: IVSPlayer.isPlayerSupported });

      if (!IVSPlayer.isPlayerSupported) {
        console.log("[IVS] not supported");
        return;
      }

      const player = IVSPlayer.create({
        wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
        wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
      });
      console.log("[IVS] player created");

      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");

      player.attachHTMLVideoElement(video);
      player.setMuted(true);
      player.setAutoplay(true);
      player.setLiveLowLatencyEnabled(true);

      player.addEventListener(IVSPlayer.PlayerState.READY, () =>
        console.log("[IVS] READY"),
      );
      player.addEventListener(IVSPlayer.PlayerState.BUFFERING, () =>
        console.log("[IVS] BUFFERING"),
      );
      player.addEventListener(IVSPlayer.PlayerState.PLAYING, () =>
        console.log("[IVS] PLAYING"),
      );
      player.addEventListener(IVSPlayer.PlayerState.ENDED, () =>
        console.log("[IVS] ENDED"),
      );

      player.addEventListener(IVSPlayer.PlayerEventType.ERROR, (e: unknown) =>
        console.log("[IVS] ERROR", e),
      );
      player.addEventListener(IVSPlayer.PlayerEventType.PLAYBACK_BLOCKED, () =>
        console.log("[IVS] PLAYBACK_BLOCKED"),
      );
      player.addEventListener(IVSPlayer.PlayerEventType.AUDIO_BLOCKED, () =>
        console.log("[IVS] AUDIO_BLOCKED"),
      );

      console.log("[IVS] loading", src);
      player.load(src);
    };

    void start();

    return () => {
      try {
        player?.delete?.();
      } catch {}
    };
  }, [src]);

  return <video ref={videoRef} controls playsInline className="w-full" />;
}

export default AndroidWebbySalesProPlayer;
