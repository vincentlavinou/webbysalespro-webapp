// components/ivs/IVSPlayer.tsx
"use client";

import React, { useRef } from "react";
import { PlayerState } from "amazon-ivs-player";
import { emitPlaybackMetadata, emitPlaybackEnded } from "@/emitter/playback/";
import { usePlayer } from "./hooks/use-player";
import { useLatencyWatchdog } from "./hooks/use-latency-watchdog";
import { useMediaSession } from "./hooks/use-media-session";
import { useVisibilityResilience } from "./hooks/use-visibility-resilience";
// import { useBackgroundAudioPlayback } from "./hooks/use-background-audio-playback";

type Props = {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  showStats?: boolean;
  ariaLabel?: string;
  title?: string;
  artwork?: MediaImage[];
  /** Option 1: keep audio alive when tab hidden */
  backgroundAudioEnabled?: boolean;
  /** Keep the player muted and alive in the background so timed metadata cues keep firing (e.g. while video injection overlay is active). */
  keepAlive?: boolean;
};

export default function WebbySalesProIVSPlayer({
  src,
  poster,
  autoPlay = false,
  muted = false,
  showStats = false,
  ariaLabel = "WebbySalesPro player",
  title,
  artwork,
  keepAlive = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const ivs = usePlayer({
    src,
    autoPlay,
    mutedProp: muted,
    videoRef,
    onTextMetadata: emitPlaybackMetadata,
    onEnded: emitPlaybackEnded,
    keepAlive,
  });

  // Latency + buffering watchdog (playerVersion ensures the effect runs after the async player init)
  useLatencyWatchdog(ivs.playerRef, src, ivs.playerVersion);

  // Background audio fallback (Option 1)
//   const bgAudio = useBackgroundAudioPlayback(videoRef, {
//     enabled: backgroundAudioEnabled,
//     hlsUrl: src,
//     onRestoreVideo: ivs.restoreToLive,
//   });

  // Visibility resilience: prefer audio fallback when hidden
  const vis = useVisibilityResilience({
    enabled: true,
    hasPlayedRef: ivs.hasPlayedRef,
    restoreToLive: ivs.restoreToLive,
    // onHiddenAudio: () => void bgAudio.toAudio(),
    // onVisibleAudio: () => void bgAudio.toVideo(),
  });

  // Lock screen metadata once we’re playing
  const effectiveState =
    ivs.playerState !== "INIT" ? ivs.playerState : (ivs.stats.state as PlayerState | undefined);

  const isPlaying = effectiveState === PlayerState.PLAYING;
  const isEnded = effectiveState === PlayerState.ENDED;
  const isLoading =
    !ivs.autoplayFailed &&
    (!effectiveState ||
      effectiveState === PlayerState.IDLE ||
      effectiveState === PlayerState.READY ||
      effectiveState === PlayerState.BUFFERING);

  const shouldBlur = !isPlaying;
  const showUnmuteNudge = isPlaying && ivs.isMuted && !muted;

  useMediaSession({
    active: isPlaying,
    title,
    ariaLabel,
    poster,
    artwork,
    onPlay: () => {
      videoRef.current?.play().catch(() => {});
    },
  });

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden border bg-black shadow-sm">
        <div className="aspect-video">
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            autoPlay
            muted={ivs.isMuted}
            preload="auto"
            aria-label={ariaLabel}
            className={`h-full w-full object-contain transition duration-200 ${shouldBlur ? "blur-sm" : ""}`}
            style={{ userSelect: "none" }}
          />
        </div>

        {/* Return banner */}
        {vis.showReturnBanner && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-emerald-600/90 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm whitespace-nowrap">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z" />
              </svg>
              Audio was playing while you were away
            </div>
          </div>
        )}

        {/* Loading / ended overlay */}
        {shouldBlur && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm pointer-events-none">
            {isLoading && (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                  Connecting to live webinar…
                </p>
              </>
            )}
            {isEnded && !isLoading && (
              <div className="rounded-md bg-black/70 px-3 py-2 text-sm font-medium text-white">
                This live webinar has ended.
              </div>
            )}
          </div>
        )}

        {/* Autoplay blocked */}
        {ivs.autoplayFailed && !isPlaying && !isEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <button
              type="button"
              onClick={async () => {
                // Prime audio in the user gesture path so Safari will allow background audio
                // bgAudio.prime();
                await ivs.handleManualPlay();
              }}
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
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
            <button
              type="button"
              onClick={ivs.tapToUnmute}
              className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-black/90 focus:outline-none"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.21 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z" />
              </svg>
              Tap to unmute
            </button>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <div>State: {effectiveState ?? "…"}</div>
            <div>Latency: {typeof ivs.stats.latency === "number" ? `${ivs.stats.latency.toFixed(1)}s` : "…"}</div>
            <div>Bitrate: {ivs.stats.bitrate ? `${ivs.stats.bitrate} kbps` : "…"}</div>
            <div>Res: {ivs.stats.resolution ?? "…"}</div>
            {/* <div>Mode: {backgroundAudioEnabled ? bgAudio.mode : "video"}</div> */}
          </div>
        )}
      </div>
    </div>
  );
}