// components/ivs/IOSWebbySalesProPlayer.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlayerState } from "amazon-ivs-player";
import { Expand, Minimize2, PictureInPicture2 } from "lucide-react";
import { emitPlaybackMetadata, emitPlaybackEnded, emitPlaybackPlaying } from "@/emitter/playback/";
import { useIvsPlayerCore } from "./hooks/use-ivs-player-core";
import { useFullscreen } from "./hooks/use-fullscreen";
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

export default function IOSWebbySalesProPlayer({
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
  const mobileChromeTimerRef = useRef<number | null>(null);
  const [showMobileChrome, setShowMobileChrome] = useState(false);

  const shouldPreventPause = useCallback(() => true, []);

  // iOS: autoPlay=false — tap-to-play gate shown immediately
  const ivs = useIvsPlayerCore({
    src,
    autoPlay: false,
    videoRef,
    onTextMetadata: emitPlaybackMetadata,
    onEnded: emitPlaybackEnded,
    onPlaying: emitPlaybackPlaying,
    keepAlive,
    shouldPreventPause,
  });

  const pip = usePiP(videoRef, ivs.restoreToLive);

  const { fullscreenMode, fullscreenModeRef } = useFullscreen({
    videoRef,
    containerRef,
    onResumeNeeded: useCallback(() => {
      void ivs.restoreToLive({ gracePeriodMs: 800 });
    }, [ivs]),
  });

  useLatencyWatchdog(ivs.playerRef, src, ivs.playerVersion);

  useVisibilityResilience({
    enabled: true,
    hasPlayedRef: ivs.hasPlayedRef,
    isPiPRef: pip.isPiPRef,
    enterPiP: pip.enterPiP,
    exitPiP: pip.exitPiP,
    // Race-proof: checks the ref directly, not a closure over stale state.
    shouldIgnoreVisibilityChange: useCallback(
      () => fullscreenModeRef.current !== "none",
      [fullscreenModeRef],
    ),
    restoreToLive: ivs.restoreToLive,
  });

  useMediaSession({
    active: ivs.mode === "playing" || ivs.mode === "playing-muted",
    title,
    ariaLabel,
    poster,
    artwork,
    onPlay: () => { videoRef.current?.play().catch(() => {}); },
    onPause: () => { videoRef.current?.play().catch(() => {}); },
  });

  // ─── Mobile chrome (rotate hint) ────────────────────────────────────────

  const clearMobileChromeTimer = useCallback(() => {
    if (mobileChromeTimerRef.current) {
      window.clearTimeout(mobileChromeTimerRef.current);
      mobileChromeTimerRef.current = null;
    }
  }, []);

  const revealMobileChrome = useCallback(() => {
    setShowMobileChrome(true);
    clearMobileChromeTimer();
    mobileChromeTimerRef.current = window.setTimeout(() => {
      setShowMobileChrome(false);
      mobileChromeTimerRef.current = null;
    }, 5000);
  }, [clearMobileChromeTimer]);

  useEffect(() => () => clearMobileChromeTimer(), [clearMobileChromeTimer]);

  // ─── Derived display state ───────────────────────────────────────────────

  const { mode, playerState } = ivs;
  const isBuffering = (mode === "playing" || mode === "playing-muted") && playerState === PlayerState.BUFFERING;
  const shouldBlur = mode !== "playing" && mode !== "playing-muted";
  const showUnmuteNudge = mode === "playing-muted" && ivs.isMuted;

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden border bg-black shadow-sm"
        onPointerUp={() => {
          revealMobileChrome();
          if (mode === "gate") void ivs.handleManualPlay();
        }}
        style={{ touchAction: "manipulation" }}
      >
        <div className="aspect-video">
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            preload="auto"
            aria-label={ariaLabel}
            className={`h-full w-full object-contain transition duration-200 ${shouldBlur ? "blur-sm" : ""}`}
            style={{ userSelect: "none", touchAction: "manipulation" }}
          />
        </div>

        {/* PiP button */}
        {pip.isPiPSupported && (
          <div className="absolute top-3 right-3 z-40">
            <button
              type="button"
              onClick={() => {
                revealMobileChrome();
                if (pip.isInPiP) {
                  pip.exitPiP();
                } else {
                  void pip.enterPiP();
                }
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label={pip.isInPiP ? "Exit picture in picture" : "Open picture in picture"}
            >
              {pip.isInPiP ? <Minimize2 className="h-4 w-4" /> : <PictureInPicture2 className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Rotate hint */}
        {showMobileChrome && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
            <span className="inline-flex items-center gap-1.5">
              <Expand className="h-3 w-3" />
              Rotate for fullscreen
            </span>
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

        {/* Tap to play gate */}
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
              <span>Tap to start the live webinar</span>
            </button>
          </div>
        )}

        {/* Unmute nudge */}
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
              <span className="text-base font-semibold">Tap to unmute</span>
            </button>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <div>Mode: {mode} | FS: {fullscreenMode}</div>
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
