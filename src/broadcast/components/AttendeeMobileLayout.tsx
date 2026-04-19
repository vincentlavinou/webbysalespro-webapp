"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatComposer } from "@/chat/component/ChatComposer";
import { WebinarChat } from "@/chat/component";
import { ChatMessages } from "@/chat/component/ChatMessages";
import { OfferChatBubble } from "@/offer-client/components/OfferChatBubble";
import { useOfferSessionClient } from "@/offer-client/hooks/use-offer-session-client";
import { WebinarMediaFieldType } from "@/media";
import type { WebinarMedia } from "@/media";
import { AttendeeCountBadge } from "../attendee-count/components";
import { useImmersiveLayout } from "../hooks/use-immersive-layout";
import { AttendeeBroadcastServiceToken } from "../service/type";
import WebbySalesProPlayer, {
  type WebbySalesProPlayerHandle,
} from "./ivs/WebbySalesProPlayer";
import { StreamRefreshControl } from "./StreamRefreshControl";
import { useAttendeeStreamRefresh } from "../hooks/use-attendee-stream-refresh";

interface AttendeeMobileLayoutProps {
  broadcast: AttendeeBroadcastServiceToken;
  title?: string;
}

type ViewportSize = {
  width: number;
  height: number;
};

const FALLBACK_VIEWPORT: ViewportSize = {
  width: 0,
  height: 500,
};

function readLayoutViewport(): ViewportSize {
  if (typeof window === "undefined") {
    return FALLBACK_VIEWPORT;
  }

  return {
    width: Math.round(window.innerWidth),
    height: Math.round(window.innerHeight),
  };
}

function LayoutControlButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto rounded-full bg-black/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur-sm transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/60"
    >
      {label}
    </button>
  );
}

export default function AttendeeMobileLayout({
  broadcast,
  title,
}: AttendeeMobileLayoutProps) {
  const { view: offerView } = useOfferSessionClient();
  const showOfferSheet =
    offerView === "offer-checkingout" || offerView === "offer-purchased";

  const playerRef = useRef<WebbySalesProPlayerHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] =
    useState<ViewportSize>(readLayoutViewport);
  const channelStream =
    broadcast.stream?.kind === "channel" ? broadcast.stream : undefined;
  const { isRefreshingStream, handleRefreshStream } = useAttendeeStreamRefresh({
    sessionId: broadcast.session.id,
    playerRef,
    enabled: !!channelStream,
  });

  const {
    enterSplit,
    exitFullscreen,
    isFullscreen,
    isFullscreenMedia,
    isFullscreenSplit,
    isPhysicalLandscape,
    layoutState,
    shouldRotatePortraitImmersive,
    shouldRotatePortraitSplit,
    toggleFullscreen,
    toggleFullscreenSurface,
  } = useImmersiveLayout();

  const isSplitLayout = layoutState === "split" || isFullscreenSplit;
  const isChatVisible = !isFullscreenMedia;
  const shouldRotateMediaFullscreen = shouldRotatePortraitImmersive;
  const shouldRotateSplitLayout = layoutState === "split" && shouldRotatePortraitSplit;
  const showRotatedSplitShell = layoutState === "split" && shouldRotateSplitLayout;

  useEffect(() => {
    const vv = window.visualViewport;

    const updateViewport = () => {
      const next = readLayoutViewport();
      setViewportSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    };

    updateViewport();

    vv?.addEventListener("resize", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      vv?.removeEventListener("resize", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const splitViewportWidth = shouldRotateSplitLayout
    ? viewportSize.height
    : viewportSize.width;
  const splitViewportHeight = shouldRotateSplitLayout
    ? viewportSize.width
    : viewportSize.height;
  const mediaViewportWidth = shouldRotateMediaFullscreen
    ? viewportSize.height
    : viewportSize.width;
  const mediaViewportHeight = shouldRotateMediaFullscreen
    ? viewportSize.width
    : viewportSize.height;
  const mediaPlayerWidth =
    mediaViewportWidth > 0 && mediaViewportHeight > 0
      ? Math.min(mediaViewportWidth, mediaViewportHeight * (16 / 9))
      : 0;

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      requestAnimationFrame(scrollToBottom),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const playerContent = broadcast.stream ? (
    <>
      <WebbySalesProPlayer
        ref={playerRef}
        src={channelStream?.config.playback_url ?? ""}
        ariaLabel="Live Webinar Player"
        title={broadcast.webinar.title}
        artwork={broadcast.webinar.media
          .filter(
            (media: WebinarMedia) =>
              media.field_type === WebinarMediaFieldType.THUMBNAIL,
          )
          .map((media: WebinarMedia) => ({ src: media.file_url }))}
      />
      <AttendeeCountBadge />
    </>
  ) : (
    <div className="grid h-full w-full place-items-center bg-black/80 text-white">
      Waiting for {title} to start...
    </div>
  );

  const shellClassName = isFullscreenMedia
    ? "h-full transition-[opacity] duration-300 ease-out"
    : showRotatedSplitShell
      ? "fixed left-1/2 top-1/2 z-30 flex flex-row overflow-hidden bg-neutral-900 transition-[opacity,transform] duration-300 ease-out"
      : isFullscreenSplit
        ? "fixed inset-0 z-40 flex h-full flex-row overflow-hidden bg-neutral-900 transition-[opacity,transform] duration-300 ease-out"
        : isSplitLayout
          ? "flex h-full flex-row transition-[opacity] duration-300 ease-out"
          : "flex h-full flex-col transition-[opacity] duration-300 ease-out";

  const shellStyle = showRotatedSplitShell
    ? {
        width: splitViewportWidth,
        height: splitViewportHeight,
        transform: "translate(-50%, -50%) rotate(90deg)",
        transformOrigin: "center center",
      }
    : undefined;

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-neutral-900 text-neutral-100">
      <div className={shellClassName} style={shellStyle}>
        <section
          className={
            isFullscreenMedia
              ? "fixed inset-0 z-50 flex items-center justify-center bg-black transition-[background-color,opacity] duration-300 ease-out"
              : isSplitLayout
                ? "relative flex h-full min-w-0 flex-[1.15] items-stretch bg-black transition-[flex-basis,opacity] duration-300 ease-out"
                : "relative shrink-0 bg-black transition-[opacity] duration-300 ease-out"
          }
        >
          <div
            className={
              isFullscreenMedia
                ? "relative flex items-center justify-center transition-[transform,width,opacity] duration-300 ease-out"
                : isSplitLayout
                  ? "relative flex flex-1 items-center justify-center self-stretch overflow-hidden transition-[transform,opacity] duration-300 ease-out"
                  : "relative grid w-full aspect-video place-items-center text-sm text-white/80 transition-[transform,opacity] duration-300 ease-out"
            }
            style={
              isFullscreenMedia
                ? {
                    width: mediaPlayerWidth || undefined,
                    transform: shouldRotateMediaFullscreen ? "rotate(90deg)" : undefined,
                    transformOrigin: "center center",
                  }
                : undefined
            }
          >
            {playerContent}
          </div>

          {channelStream && (
            <StreamRefreshControl
              className={
                isFullscreen
                  ? "pointer-events-auto fixed left-1/2 top-3 z-[60] -translate-x-1/2"
                  : "pointer-events-auto absolute left-1/2 top-3 z-30 -translate-x-1/2"
              }
              onRefresh={handleRefreshStream}
              isRefreshing={isRefreshingStream}
            />
          )}

          {broadcast.stream && (
            <div
              className={
                isFullscreen
                  ? "pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-end gap-2 p-3"
                  : "pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-end gap-2 p-2.5"
              }
            >
              {!isFullscreenMedia ? (
                <LayoutControlButton
                  label={isSplitLayout ? "Media Only" : "Split View"}
                  onClick={() => {
                    if (isSplitLayout) {
                      toggleFullscreenSurface();
                      return;
                    }
                    enterSplit();
                  }}
                />
              ) : (
                <LayoutControlButton
                  label={isPhysicalLandscape ? "Show Chat" : "Back To Chat"}
                  onClick={toggleFullscreenSurface}
                />
              )}

              <LayoutControlButton
                label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                onClick={isFullscreen ? exitFullscreen : toggleFullscreen}
              />
            </div>
          )}
        </section>

        {broadcast.stream && isChatVisible && (
          <WebinarChat
            sessionId={broadcast.session.id}
            registrantId={broadcast.registrant_id}
            region={broadcast.stream.region}
            currentUserRole={broadcast.role}
            render={() => (
              <section
                className={
                  isSplitLayout
                    ? "relative flex min-h-0 flex-1 flex-col border-l border-white/10 bg-background text-foreground transition-[opacity,transform] duration-300 ease-out"
                    : "relative flex min-h-0 flex-1 flex-col bg-background text-foreground transition-[opacity,transform] duration-300 ease-out"
                }
                style={showRotatedSplitShell ? { height: splitViewportHeight } : undefined}
              >
                <main
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto overscroll-y-auto touch-pan-y"
                >
                  <ChatMessages scrollRef={scrollRef} autoStick={true} />
                </main>

                <AnimatePresence>
                  {showOfferSheet && (
                    <motion.div
                      key={`offer-sheet-${isSplitLayout ? "landscape" : "portrait"}`}
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 32, stiffness: 300 }}
                      className={
                        isSplitLayout
                          ? "absolute inset-0 z-30 overflow-y-auto bg-background shadow-[-8px_0_24px_rgba(0,0,0,0.2)]"
                          : "absolute inset-x-0 bottom-0 top-0 z-30 overflow-y-auto rounded-t-xl bg-background shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
                      }
                    >
                      <OfferChatBubble />
                    </motion.div>
                  )}
                </AnimatePresence>

                <footer className="shrink-0 border-t border-white/10 bg-neutral-900/95 backdrop-blur">
                  <ChatComposer />
                </footer>
              </section>
            )}
          />
        )}
      </div>
    </div>
  );
}
