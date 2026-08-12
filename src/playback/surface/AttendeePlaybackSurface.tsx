"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import { WebinarMainLayoutLoading } from "@/broadcast/components";
import { getSessionAction } from "@/webinar/service/action";
import { WebinarSessionStatus } from "@/webinar/service/enum";
import { FullscreenOverlayButton } from "@/playback/player/ivs/FullscreenOverlayButton";
import { useTransientFullscreenControl } from "@/playback/player/ivs/hooks/use-transient-fullscreen-control";
import { useFullscreen } from "@/playback/player/ivs/hooks/use-fullscreen";
import type { PlaybackStatus } from "../context/PlaybackRuntimeContext";
import { usePlaybackSurface } from "./use-playback-surface";

export type AttendeePlaybackSurfaceHandle = {
  restoreToLive: (options?: {
    forceReload?: boolean;
    gracePeriodMs?: number;
  }) => Promise<void>;
  enterFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
};

type AttendeePlaybackSurfaceProps = {
  sessionId: string;
  /** Tailwind aspect class for the outer surface. */
  surfaceAspect: string;
  /**
   * Identity of the container the persistent element should live in. The
   * attachment effect re-runs when this changes, so a renderer that swaps
   * between differently-shaped containers must give each its own key.
   */
  attachKey: string;
  objectFit: "cover" | "contain";
  pausedMessage?: string;
  onPlaybackStatusChange?: (status: PlaybackStatus) => void;
  /** Receives the ref that must be placed on the main tile's container. */
  children: (containerRef: React.RefObject<HTMLDivElement | null>) => React.ReactNode;
};

function PlaybackPausedCard({ message }: { message: string }) {
  return (
    <div className="relative w-full max-h-[80vh] aspect-video overflow-hidden rounded-md border bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(0,0,0,1))]" />
      <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
        <div className="max-w-xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
            Live stage paused
          </p>
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">{message}</h2>
        </div>
      </div>
    </div>
  );
}

/**
 * Everything an attendee video surface does that has nothing to do with how many
 * publishers there are: connect gating, the paused card, borrowing the persistent
 * element into the visible tree, autoplay recovery, fullscreen, and noticing that
 * the session ended.
 *
 * Shared by the solo and stage renderers so the only thing either of them
 * actually writes is the arrangement of tiles inside `children`.
 */
export const AttendeePlaybackSurface = forwardRef<
  AttendeePlaybackSurfaceHandle,
  AttendeePlaybackSurfaceProps
>(function AttendeePlaybackSurface(
  {
    sessionId,
    surfaceAspect,
    attachKey,
    objectFit,
    pausedMessage = "The live stage will be right back",
    onPlaybackStatusChange,
    children,
  },
  ref,
) {
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
    surfaceMode,
    reconnectStage,
    handleStartPlayback,
    handleUnmute,
  } = usePlaybackSurface();

  const { enterFullscreen, exitFullscreen } = useFullscreen({
    videoRef,
    containerRef: playerSurfaceRef,
    // Unlike the HLS player (which the IVS SDK can leave IDLE after a
    // fullscreen transition), a WebRTC connection keeps its MediaStream
    // attached, so a full reconnect would just cause a visible refresh. The
    // provider already auto-resumes a paused element, so a gentle play() is all
    // the fullscreen exit needs.
    onResumeNeeded: () => {
      const video = videoRef.current;
      if (!video || !video.paused) return;
      void video.play().catch(() => {});
    },
  });

  // The surface swaps between loading/paused/live trees, so the attachment
  // effect must re-run when the active video container appears.
  useLayoutEffect(() => {
    const video = videoRef.current;
    const container = videoContainerRef.current;
    const host = hiddenHostRef.current;
    if (!video || !container) return;

    video.style.cssText =
      `position:absolute;inset:0;width:100%;height:100%;object-fit:${objectFit};pointer-events:none;`;
    if (video.parentElement !== container) {
      container.appendChild(video);
      // Re-appending can leave the element paused in some browsers. The provider
      // auto-resumes on a pause event, but nudging it here recovers immediately
      // rather than after a round trip through that handler.
      void video.play().catch(() => {});
    }

    return () => {
      video.style.cssText =
        "position:absolute;width:0;height:0;opacity:0;pointer-events:none;";
      if (host && video.parentElement !== host) {
        host.appendChild(video);
      }
    };
  }, [
    attachKey,
    hiddenHostRef,
    isConnected,
    mainParticipantHasActiveVideo,
    objectFit,
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

    const streamLooksInactive = !isConnected || !mainParticipant;
    if (!hasSeenLiveStageRef.current || !streamLooksInactive) return;

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
    return <PlaybackPausedCard message={pausedMessage} />;
  }

  return (
    <div
      ref={playerSurfaceRef}
      className={`relative w-full overflow-hidden rounded-md border bg-black max-h-[80vh] ${surfaceAspect}`}
      onPointerUp={toggleControls}
      style={{ touchAction: "manipulation" }}
    >
      {children(videoContainerRef)}

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
