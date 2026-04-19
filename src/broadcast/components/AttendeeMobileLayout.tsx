"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
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
    layoutState,
    shouldRotatePortraitSplit,
  } = useImmersiveLayout();

  const isSplitLayout = layoutState === "split";
  const shouldRotateSplitLayout = layoutState === "split" && shouldRotatePortraitSplit;
  const showRotatedSplitShell = layoutState === "split" && shouldRotateSplitLayout;

  useEffect(() => {
    const vv = window.visualViewport;
    let frameId: number | null = null;

    const commitViewport = () => {
      frameId = null;
      const next = readLayoutViewport();
      setViewportSize((current) =>
        current.width === next.width && current.height === next.height
          ? current
          : next,
      );
    };

    const updateViewport = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(commitViewport);
    };

    commitViewport();

    vv?.addEventListener("resize", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
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

  const shellClassName = showRotatedSplitShell
    ? "fixed left-1/2 top-1/2 z-30 flex flex-row overflow-hidden bg-neutral-900 transition-[opacity,transform] duration-300 ease-out"
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
            isSplitLayout
              ? "relative flex h-full min-w-0 flex-[1.15] items-stretch bg-black transition-[flex-basis,opacity] duration-300 ease-out"
              : "relative shrink-0 bg-black transition-[opacity] duration-300 ease-out"
          }
        >
          <div
            className={
              isSplitLayout
                ? "relative flex flex-1 items-center justify-center self-stretch overflow-hidden transition-[transform,opacity] duration-300 ease-out"
                : "relative grid w-full aspect-video place-items-center text-sm text-white/80 transition-[transform,opacity] duration-300 ease-out"
            }
          >
            {playerContent}
          </div>

          {channelStream && (
            <StreamRefreshControl
              className="pointer-events-auto absolute left-1/2 top-3 z-30 -translate-x-1/2"
              onRefresh={handleRefreshStream}
              isRefreshing={isRefreshingStream}
            />
          )}

          {broadcast.stream && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-end p-2.5">
              <button
                type="button"
                onClick={() => {
                  void playerRef.current?.enterFullscreen();
                }}
                className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition-all duration-200 ease-out hover:scale-105 hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/60"
                aria-label="Enter fullscreen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </section>

        {broadcast.stream && (
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
