// components/ivs/DesktopWebbySalesProPlayer.tsx
"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { PlayerState } from "amazon-ivs-player";
import { PictureInPicture2, Minimize2 } from "lucide-react";
import { emitPlaybackMetadata, emitPlaybackEnded, emitPlaybackPlaying } from "@/emitter/playback/";
import { usePlayerCore } from "./hooks/use-player-core";
import { useLatencyWatchdog } from "./hooks/use-latency-watchdog";
import { useMediaSession } from "./hooks/use-media-session";
import { useVisibilityResilience } from "./hooks/use-visibility-resilience";
import { usePiP } from "./hooks/use-pip";

type Props = {
  src: string;
  poster?: string;
  showStats?: boolean;
  ariaLabel?: string;
  title?: string;
  artwork?: MediaImage[];
  keepAlive?: boolean;
};

export default function DesktopWebbySalesProPlayer({
  src,
  poster,
  showStats = false,
  ariaLabel = "WebbySalesPro player",
  title,
  artwork,
  keepAlive = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const shouldPreventPause = useCallback(() => true, []);

  // Desktop: autoPlay=true — attempt autoplay with sound; click-to-play on block
  const ivs = usePlayerCore({
    src,
    autoPlay: true,
    videoRef,
    onTextMetadata: emitPlaybackMetadata,
    onEnded: emitPlaybackEnded,
    onPlaying: emitPlaybackPlaying,
    keepAlive,
    shouldPreventPause,
  });

  const pip = usePiP(videoRef, ivs.restoreToLive);

  useLatencyWatchdog(ivs.playerRef, src, ivs.playerVersion);

  // Desktop browsers don't fire visibilitychange on fullscreen transitions,
  // so no shouldIgnoreVisibilityChange guard is needed here.
  useVisibilityResilience({
    enabled: true,
    hasPlayedRef: ivs.hasPlayedRef,
    restoreToLive: ivs.restoreToLive,
  });

  useMediaSession({
    active: ivs.mode === "playing",
    title,
    ariaLabel,
    poster,
    artwork,
    onPlay: () => { videoRef.current?.play().catch(() => {}); },
    onPause: () => { videoRef.current?.play().catch(() => {}); },
  });

  // Resume if the user exits native browser fullscreen and the video paused.
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) return;
      const v = videoRef.current;
      if (!v?.paused) return;
      window.setTimeout(() => {
        if (document.fullscreenElement || !v.paused) return;
        void ivs.restoreToLive();
      }, 150);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [ivs]);

  // ─── Derived display state ───────────────────────────────────────────────

  const { mode, playerState } = ivs;
  const isBuffering = mode === "playing" && playerState === PlayerState.BUFFERING;
  const shouldBlur = mode !== "playing";
  const showUnmuteNudge = mode === "playing" && ivs.isMuted;

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden border bg-black shadow-sm"
        style={{ touchAction: "manipulation" }}
      >
        <div className="aspect-video">
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            muted={ivs.isMuted}
            preload="auto"
            aria-label={ariaLabel}
            className={`h-full w-full object-contain transition duration-200 ${shouldBlur ? "blur-sm" : ""}`}
            style={{ userSelect: "none" }}
          />
        </div>

        {/* PiP button */}
        {pip.isPiPSupported && (
          <div className="absolute top-3 right-3 z-40">
            <button
              type="button"
              onClick={() => pip.isInPiP ? pip.exitPiP() : void pip.enterPiP()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label={pip.isInPiP ? "Exit picture in picture" : "Open picture in picture"}
            >
              {pip.isInPiP ? <Minimize2 className="h-4 w-4" /> : <PictureInPicture2 className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Loading / buffering overlay */}
        {(mode === "idle" || isBuffering) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
            <p className="text-xs font-medium uppercase tracking-wide text-white/80">
              {isBuffering ? "Connecting to live webinar…" : "Preparing live webinar…"}
            </p>
          </div>
        )}

        {/* Ended overlay */}
        {mode === "ended" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="rounded-md bg-black/70 px-3 py-2 text-sm font-medium text-white">
              This live webinar has ended.
            </div>
          </div>
        )}

        {/* Click to play gate */}
        {mode === "gate" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => void ivs.handleManualPlay()}
              className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 translate-x-[1px]">
                  <polygon points="6,4 20,12 6,20" fill="currentColor" />
                </svg>
              </span>
              <span>Click to start the live webinar</span>
            </button>
          </div>
        )}

        {/* Unmute nudge (safety net — stream should never start muted) */}
        {showUnmuteNudge && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={ivs.tapToUnmute}
              className="flex flex-col items-center gap-3 rounded-2xl bg-black/80 px-8 py-6 text-white shadow-xl backdrop-blur-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.21 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z" />
              </svg>
              <span className="text-base font-semibold">Click to unmute</span>
            </button>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <div>Mode: {mode}</div>
            <div>IVS: {playerState ?? "…"}</div>
            <div>Latency: {typeof ivs.stats.latency === "number" ? `${ivs.stats.latency.toFixed(1)}s` : "…"}</div>
            <div>Bitrate: {ivs.stats.bitrate ? `${ivs.stats.bitrate} kbps` : "…"}</div>
            <div>Res: {ivs.stats.resolution ?? "…"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
