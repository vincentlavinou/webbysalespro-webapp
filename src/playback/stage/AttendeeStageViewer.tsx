"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { WebinarMainLayoutLoading } from "@/broadcast/components/views/WebinarMainLayoutLoading";
import { usePersistentStagePlayback } from "@/playback/persistent/use-persistent-stage-playback";
import { PlaybackStatus } from "../context/PlaybackRuntimeContext";
import { useFullscreen } from "../player/ivs/hooks/use-fullscreen";

type AttendeeStageViewerProps = {
  onPlaybackStatusChange?: (status: PlaybackStatus) => void;
};

export type AttendeeStageViewerHandle = {
  restoreToLive: (options?: {
    forceReload?: boolean;
    gracePeriodMs?: number;
  }) => Promise<void>;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
};

function StageParticipantFallback({
  presenterName,
}: {
  presenterName?: string;
}) {
  return (
    <div className="relative w-full max-h-[80vh] aspect-video overflow-hidden rounded-md border bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(0,0,0,1))]" />
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <div className="max-w-xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
            Live stage paused
          </p>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            {presenterName
              ? `${presenterName} will be right back`
              : "The presenter will be right back"}
          </h2>
        </div>
      </div>
    </div>
  );
}

export const AttendeeStageViewer = forwardRef<
  AttendeeStageViewerHandle,
  AttendeeStageViewerProps
>(function AttendeeStageViewer({ onPlaybackStatusChange }, ref) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const playerSurfaceRef = useRef<HTMLDivElement>(null);

  const {
    videoRef,
    hiddenHostRef,
    isConnected,
    mainParticipant,
    mainParticipantHasActiveVideo,
    presenterName,
    surfaceMode,
    aspectRatio,
    reconnectStage,
    handleStartPlayback,
    handleUnmute,
  } = usePersistentStagePlayback();

  const { enterFullscreen, exitFullscreen, isFullscreen } = useFullscreen({
    videoRef,
    containerRef: playerSurfaceRef,
    onResumeNeeded: () => {
      void reconnectStage({ gracePeriodMs: 150 });
    },
  });

  // Move the persistent <video> into this view's container on mount.
  // On unmount, return it to the hidden host — WebRTC audio keeps playing.
  useLayoutEffect(() => {
    const video = videoRef.current;
    const container = videoContainerRef.current;
    const host = hiddenHostRef.current;
    if (!video || !container) return;

    video.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;";
    container.appendChild(video);

    return () => {
      video.style.cssText =
        "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      host?.appendChild(video);
    };
  }, [
    hiddenHostRef,
    isConnected,
    mainParticipantHasActiveVideo,
    videoRef,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      restoreToLive: reconnectStage,
      enterFullscreen,
      exitFullscreen,
    }),
    [enterFullscreen, exitFullscreen, reconnectStage],
  );

  useEffect(() => {
    if (!isConnected) {
      onPlaybackStatusChange?.("loading");
      return;
    }
    if (!mainParticipant || !mainParticipantHasActiveVideo) {
      onPlaybackStatusChange?.("ready");
      return;
    }
    onPlaybackStatusChange?.("playing");
  }, [
    isConnected,
    mainParticipant,
    mainParticipantHasActiveVideo,
    onPlaybackStatusChange,
  ]);

  if (!isConnected) {
    return <WebinarMainLayoutLoading aspectClassName="aspect-video" />;
  }

  if (!mainParticipant || !mainParticipantHasActiveVideo) {
    return <StageParticipantFallback presenterName={presenterName} />;
  }

  return (
    <div
      ref={playerSurfaceRef}
      className={`relative w-full overflow-hidden rounded-md border bg-black ${isFullscreen ? "h-full min-h-screen" : `max-h-[80vh] ${aspectRatio}`}`}
    >
      {/* video is reparented here via useLayoutEffect */}
      <div ref={videoContainerRef} className="absolute inset-0" />

      {surfaceMode === "blocked" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => void handleStartPlayback()}
            className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300">
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4 translate-x-[1px]"
              >
                <polygon points="6,4 20,12 6,20" fill="currentColor" />
              </svg>
            </span>
            <span>Tap to start the live webinar</span>
          </button>
        </div>
      )}

      {surfaceMode === "playing-muted" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => void handleUnmute()}
            className="flex flex-col items-center gap-3 rounded-2xl bg-black/80 px-8 py-6 text-white shadow-xl backdrop-blur-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10 shrink-0"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.21 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z" />
            </svg>
            <span className="text-base font-semibold">Tap to unmute</span>
          </button>
        </div>
      )}
    </div>
  );
});
