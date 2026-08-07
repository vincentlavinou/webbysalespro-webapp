"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";
import { WebinarMainLayoutLoading } from "@/broadcast/components";
import { getSessionAction } from "@/webinar/service/action";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { usePersistentStagePlayback } from "@/playback/persistent/use-persistent-stage-playback";
import { FullscreenOverlayButton } from "@/playback/player/ivs/FullscreenOverlayButton";
import { useTransientFullscreenControl } from "@/playback/player/ivs/hooks/use-transient-fullscreen-control";
import { PlaybackStatus } from "../context/PlaybackRuntimeContext";
import { useFullscreen } from "../player/ivs/hooks/use-fullscreen";
import { useRouter } from "next/navigation";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";

type AttendeeStageViewerProps = {
  sessionId: string;
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
  participantName,
}: {
  participantName?: string;
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
            {participantName
              ? `${participantName} will be right back`
              : "The live stage will be right back"}
          </h2>
        </div>
      </div>
    </div>
  );
}

function StageVideoTile({
  participant,
  className,
  muted = false,
}: {
  participant: WebiSalesProParticipant;
  className?: string;
  muted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tracks = participant.streams
      .map(({ mediaStreamTrack }) => mediaStreamTrack)
      .filter((track) => track.kind === "video" || (!muted && track.kind === "audio"));
    const stream = new MediaStream(tracks);
    video.srcObject = stream;
    video.muted = muted;
    video.defaultMuted = muted;
    void video.play().catch(() => {});

    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [muted, participant]);

  const name = participant.participant.attributes?.name;

  return (
    // cn() must merge here: the overlay PiP passes `absolute`, and a plain
    // template string would lose to the `relative` default because Tailwind
    // emits `.relative` after `.absolute`, not because of class order.
    <div className={cn("relative overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="h-full w-full object-contain"
      />
      {typeof name === "string" && name.trim() && (
        <div className="absolute bottom-0 left-0 w-full truncate bg-black/60 px-2 py-1 text-xs text-white">
          {name}
        </div>
      )}
    </div>
  );
}

type PipCorner = "top_left" | "top_right" | "bottom_left" | "bottom_right";

const DEFAULT_PIP_CORNER: PipCorner = "bottom_right";

function normalizePipCorner(corner?: string): PipCorner {
  const normalized = corner?.trim().toLowerCase().replace(/-/g, "_");

  switch (normalized) {
    case "top_left":
    case "top_right":
    case "bottom_left":
    case "bottom_right":
      return normalized;
    default:
      return DEFAULT_PIP_CORNER;
  }
}

function pipPosition(
  pip?: { placement: "overlay" | "docked"; corner?: string; side?: string },
) {
  const corner = normalizePipCorner(pip?.corner);

  // 4px inset mirrors the host composite's pipMargin of 4 (admin
  // broadcast/service/video.ts), so the attendee overlay hugs the edge the same
  // way the burned-in canvas PiP does.
  switch (corner) {
    case "top_left":
      return "left-1 top-1";
    case "top_right":
      return "right-1 top-1";
    case "bottom_left":
      return "bottom-1 left-1";
    case "bottom_right":
      return "bottom-1 right-1";
  }
}

// Percentages track the host composite's geometry: its default targetHeight of
// 140 on a 720p canvas is ~19% of the stage, and resolvePipRect caps a PiP at
// 35% of canvas height. The tile is aspect-video inside a 16:9 surface, so a
// width percentage equals that height percentage. min-w matches MIN_PIP_WIDTH.
function pipSize(size?: "small" | "medium" | "large") {
  if (size === "large") return "w-[35%] min-w-[96px] max-w-[420px]";
  if (size === "medium") return "w-[26%] min-w-[96px] max-w-[320px]";
  return "w-[18%] min-w-[96px] max-w-[240px]";
}

export const AttendeeStageViewer = forwardRef<
  AttendeeStageViewerHandle,
  AttendeeStageViewerProps
>(function AttendeeStageViewer({ sessionId, onPlaybackStatusChange }, ref) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const playerSurfaceRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const hasSeenLiveStageRef = useRef(false);

  const {
    videoRef,
    hiddenHostRef,
    isConnected,
    mainParticipant,
    mainParticipantHasActiveVideo,
    participantName,
    layout,
    stageStateEnabled,
    surfaceMode,
    aspectRatio,
    reconnectStage,
    handleStartPlayback,
    handleUnmute,
  } = usePersistentStagePlayback();

  const secondaryVideoMuted = surfaceMode !== "playing";

  const { enterFullscreen, exitFullscreen } = useFullscreen({
    videoRef,
    containerRef: playerSurfaceRef,
    // Unlike the HLS player (which the IVS SDK can leave IDLE after a
    // fullscreen transition), a WebRTC stage keeps its MediaStream attached, so
    // a full reconnect would just cause a visible refresh. The persistent
    // provider already auto-resumes a paused element, so a gentle play() is all
    // the fullscreen exit needs.
    onResumeNeeded: () => {
      const video = videoRef.current;
      if (!video || !video.paused) return;
      void video.play().catch(() => {});
    },
  });

  // The stage viewer swaps between loading/fallback/live surfaces, so the
  // attachment effect must re-run when the active video surface appears.
  useLayoutEffect(() => {
    const video = videoRef.current;
    const container = videoContainerRef.current;
    const host = hiddenHostRef.current;
    if (!video || !container) return;

    video.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;";
    if (video.parentElement !== container) {
      container.appendChild(video);
    }

    return () => {
      video.style.cssText =
        "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      if (host && video.parentElement !== host) {
        host.appendChild(video);
      }
    };
  }, [
    hiddenHostRef,
    isConnected,
    mainParticipantHasActiveVideo,
    layout.mode,
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

  useEffect(() => {
    if (mainParticipantHasActiveVideo) {
      hasSeenLiveStageRef.current = true;
      return;
    }

    const stageLooksInactive = !isConnected || !mainParticipant;
    if (!hasSeenLiveStageRef.current || !stageLooksInactive) return;

    let cancelled = false;

    const checkForCompletedSession = async () => {
      const result = await getSessionAction({ id: sessionId });
      if (cancelled || !result?.data) return;

      if (
        result.data.status === WebinarSessionStatus.COMPLETED ||
        result.data.status === WebinarSessionStatus.CANCELED
      ) {
        router.replace(`/${sessionId}/completed`);
      }
    };

    void checkForCompletedSession();
    const intervalId = window.setInterval(() => {
      void checkForCompletedSession();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isConnected, mainParticipant, mainParticipantHasActiveVideo, router, sessionId]);

  const {
    isVisible: isFullscreenControlVisible,
    toggleControls,
    showControls,
  } = useTransientFullscreenControl({
    enabled: surfaceMode === "playing" || surfaceMode === "playing-muted",
  });

  if (!isConnected) {
    return <WebinarMainLayoutLoading aspectClassName="aspect-video" />;
  }

  if (!mainParticipant || !mainParticipantHasActiveVideo) {
    return <StageParticipantFallback participantName={participantName} />;
  }

  return (
    <div
      ref={playerSurfaceRef}
      className={`relative w-full overflow-hidden rounded-md border bg-black max-h-[80vh] ${aspectRatio}`}
      onPointerUp={toggleControls}
      style={{ touchAction: "manipulation" }}
    >
      {stageStateEnabled && layout.mode === "grid" ? (
        <div className="grid h-full w-full grid-cols-1 gap-1 bg-black sm:grid-cols-2">
          <div ref={videoContainerRef} className="relative min-h-0 overflow-hidden bg-black" />
          {layout.grid.slice(1).map((participant) => (
            <StageVideoTile
              key={participant.participant.id}
              participant={participant}
              muted={secondaryVideoMuted}
              className="min-h-0"
            />
          ))}
        </div>
      ) : stageStateEnabled && layout.mode === "pip" && layout.secondary && layout.pip?.placement === "docked" ? (
        <div className={`flex h-full w-full ${layout.pip.side === "left" ? "flex-row-reverse" : "flex-row"}`}>
          <div ref={videoContainerRef} className="relative min-w-0 flex-1 overflow-hidden bg-black" />
          <StageVideoTile
            participant={layout.secondary}
            muted={secondaryVideoMuted}
            className="h-full w-1/3 shrink-0 border-white/30"
          />
        </div>
      ) : (
        <>
          <div ref={videoContainerRef} className="absolute inset-0" />
          {stageStateEnabled && layout.mode === "pip" && layout.secondary && (
            <StageVideoTile
              participant={layout.secondary}
              muted={secondaryVideoMuted}
              className={cn(
                "absolute z-10 aspect-video rounded-lg border border-white/30 shadow-2xl",
                pipSize(layout.pip?.size),
                pipPosition(layout.pip),
              )}
            />
          )}
        </>
      )}

      {/* No tap-to-start gate: when even muted autoplay is blocked
          ("blocked"), the unmute nudge doubles as the start gesture —
          handleStartPlayback tries sound first and falls back to muted. */}
      {(surfaceMode === "blocked" || surfaceMode === "playing-muted") && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => {
              if (surfaceMode === "blocked") {
                void handleStartPlayback();
              } else {
                void handleUnmute();
              }
              showControls();
            }}
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

      <FullscreenOverlayButton
        isVisible={isFullscreenControlVisible}
        onClick={() => {
          showControls();
          void enterFullscreen();
        }}
      />
    </div>
  );
});
