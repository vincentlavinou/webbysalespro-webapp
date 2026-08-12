"use client";

import { forwardRef, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { WebiSalesProParticipant } from "@/broadcast/context/StageContext";
import type { PlaybackStatus } from "../context/PlaybackRuntimeContext";
import {
  AttendeePlaybackSurface,
  type AttendeePlaybackSurfaceHandle,
} from "../surface/AttendeePlaybackSurface";
import { usePlaybackSurface } from "../surface/use-playback-surface";
import { useStageArrangement } from "./StageArrangementContext";
import {
  DOCKED_RAIL,
  DOCKED_RAIL_TILE,
  FLOATING_RAIL_TILE,
  MAIN_TILE_FILL,
  dockedRowClass,
  floatingRailClass,
  galleryGridClass,
  showTileName,
  stageSurfaceAspect,
  tileObjectFit,
  type StageTileSlot,
} from "./stage-geometry";

type AttendeeStageViewerProps = {
  sessionId: string;
  onPlaybackStatusChange?: (status: PlaybackStatus) => void;
};

export type AttendeeStageViewerHandle = AttendeePlaybackSurfaceHandle;

function StageVideoTile({
  participant,
  className,
  muted = false,
  slot = "main",
}: {
  participant: WebiSalesProParticipant;
  className?: string;
  muted?: boolean;
  slot?: StageTileSlot;
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
  const objectFit = tileObjectFit(participant.participant.attributes?.kind, slot);

  return (
    // cn() must merge here: a floating rail tile passes `absolute`, and a plain
    // template string would lose to the `relative` default because Tailwind
    // emits `.relative` after `.absolute`, not because of class order.
    <div className={cn("relative overflow-hidden bg-black", className)}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={cn("h-full w-full", objectFit)}
      />
      {showTileName(slot) && typeof name === "string" && name.trim() && (
        <div className="absolute bottom-0 left-0 w-full truncate bg-black/60 px-2 py-1 text-xs text-white">
          {name}
        </div>
      )}
    </div>
  );
}

/**
 * The attendee surface for a session that has layout setup.
 *
 * Only the tile arrangement lives here — connection, autoplay, fullscreen and
 * the paused card come from AttendeePlaybackSurface, shared with the solo path.
 *
 * A rail is a column at a side, so `placement` and `side` off the arrangement
 * are the only geometry left. A floating rail runs deliberately narrow (w-1/5)
 * for the same reason the old overlay PiP did: it sits on top of the main video
 * rather than being composited into it, so every extra percent is main-stage
 * footage the viewer loses.
 */
export const AttendeeStageViewer = forwardRef<
  AttendeeStageViewerHandle,
  AttendeeStageViewerProps
>(function AttendeeStageViewer({ sessionId, onPlaybackStatusChange }, ref) {
  const { surfaceMode, aspectRatio } = usePlaybackSurface();
  const { layout } = useStageArrangement();

  const secondaryVideoMuted = surfaceMode !== "playing";

  const isGallery = layout.shape === "gallery";
  const hasRail = layout.shape === "feature" && layout.rail.length > 0;
  const isDockedRail = hasRail && layout.placement === "docked";
  const isFloatingRail = hasRail && layout.placement === "floating";

  /**
   * Which of the three container divs below the persistent <video> belongs to.
   *
   * This keys the attachment effect rather than `layout.shape`, because a docked
   * rail and a full-bleed main tile are both the `feature` shape yet render
   * different containers. Keying on shape alone meant that going from full-bleed
   * content to content-plus-rail — a camera simply turning on — swapped the
   * container without re-attaching, leaving the one persistent <video> parented
   * to a div React had already removed. The main stage went black while the rail,
   * which renders its own elements, kept showing content. That is why content
   * only appeared once it was in the rail.
   */
  const mainTileSlot = isGallery ? "gallery" : isDockedRail ? "docked" : "bleed";

  // Every proportion below comes from stage-geometry, shared with the console, so
  // a host reading their stage is reading this one.
  const galleryTileCount = layout.tiles.length;
  const surfaceAspect = stageSurfaceAspect(layout.shape, galleryTileCount, aspectRatio);

  return (
    <AttendeePlaybackSurface
      ref={ref}
      sessionId={sessionId}
      surfaceAspect={surfaceAspect}
      attachKey={mainTileSlot}
      // The persistent element is gallery tile one, so its fit has to follow the
      // same rule as the tiles beside it — it was pinned to `contain` while its
      // neighbours cropped, which made tile one the odd one out in every gallery.
      // A gallery only forms when no source is live, so its tiles are all cameras.
      objectFit={mainTileSlot === "gallery" ? "cover" : "contain"}
      onPlaybackStatusChange={onPlaybackStatusChange}
    >
      {(containerRef) =>
        isGallery ? (
          <div className={galleryGridClass(galleryTileCount)}>
            {/* The persistent element carries the main participant's tracks, so it
                is always tile one rather than being mapped with the rest. */}
            <div ref={containerRef} className="relative min-h-0 overflow-hidden bg-black" />
            {layout.tiles.slice(1).map((participant) => (
              <StageVideoTile
                key={participant.participant.id}
                participant={participant}
                muted={secondaryVideoMuted}
                slot="gallery"
                className="min-h-0"
              />
            ))}
          </div>
        ) : isDockedRail ? (
          <div className={dockedRowClass(layout.side)}>
            <div ref={containerRef} className={MAIN_TILE_FILL} />
            <div className={DOCKED_RAIL}>
              {layout.rail.map((participant) => (
                <StageVideoTile
                  key={participant.participant.id}
                  participant={participant}
                  muted={secondaryVideoMuted}
                  slot="rail"
                  className={DOCKED_RAIL_TILE}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div ref={containerRef} className="absolute inset-0" />
            {isFloatingRail && (
              <div className={cn(floatingRailClass(layout.side))}>
                {layout.rail.map((participant) => (
                  <StageVideoTile
                    key={participant.participant.id}
                    participant={participant}
                    muted={secondaryVideoMuted}
                    slot="rail"
                    className={FLOATING_RAIL_TILE}
                  />
                ))}
              </div>
            )}
          </>
        )
      }
    </AttendeePlaybackSurface>
  );
});
