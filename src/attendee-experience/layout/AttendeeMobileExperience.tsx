"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WebinarMediaFieldType } from "@/media";
import type { WebinarMedia } from "@/media";
import { useOfferSessionClient } from "@/offer-client/hooks/use-offer-session-client";
import { OfferChatBubble } from "@/offer-client/components/OfferChatBubble";
import { ChatComposer } from "@/chat/component/ChatComposer";
import { ChatMessages } from "@/chat/component/ChatMessages";
import { AttendeeCountBadge } from "@/broadcast/attendee-count/components/AttendeeCountBadge";
import { useImmersiveLayout } from "@/broadcast/hooks/use-immersive-layout";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import WebbySalesProPlayer from "@/playback/player/ivs/WebbySalesProPlayer";
import { StreamRefreshControl } from "@/broadcast/components/StreamRefreshControl";
import { usePlaybackRuntime } from "@/playback/hooks/use-playback-runtime";
import {
  type AttendeeStreamRecoveryHandle,
  useAttendeeStreamRefresh,
} from "@/broadcast/hooks/use-attendee-stream-refresh";
import { AttendeeStageViewer } from "@/playback/stage/AttendeeStageViewer";

type AttendeeMobileExperienceProps = {
  playbackToken: AttendeeBroadcastServiceToken;
  title?: string;
};

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

function isTextEntryElement(element: Element | null): boolean {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLElement && element.isContentEditable)
  );
}

function readKeyboardInset(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  const activeElement = document.activeElement;
  if (!isTextEntryElement(activeElement)) {
    return 0;
  }

  const vv = window.visualViewport;
  if (!vv) {
    return 0;
  }

  const overlap = Math.max(
    0,
    Math.round(window.innerHeight - vv.height - vv.offsetTop),
  );

  return overlap >= 120 ? overlap : 0;
}

export function AttendeeMobileExperience({
  playbackToken,
}: AttendeeMobileExperienceProps) {
  const { view: offerView } = useOfferSessionClient();
  const showOfferSheet =
    offerView === "offer-checkingout" || offerView === "offer-purchased";

  const playerRef = useRef<AttendeeStreamRecoveryHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState<ViewportSize>(readLayoutViewport);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [isTextEntryFocused, setIsTextEntryFocused] = useState(false);
  const { setStatus } = usePlaybackRuntime();
  const channelStream =
    playbackToken.stream?.kind === "channel" ? playbackToken.stream : undefined;
  const realtimeStream =
    playbackToken.stream?.kind === "realtime" ? playbackToken.stream : undefined;
  const { isRefreshingStream, handleRefreshStream } = useAttendeeStreamRefresh({
    sessionId: playbackToken.session.id,
    playerRef,
    enabled: !!playbackToken.stream,
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

    const commitLayout = () => {
      frameId = null;
      const nextViewport = readLayoutViewport();
      const nextKeyboardInset = readKeyboardInset();

      setViewportSize((current) =>
        current.width === nextViewport.width && current.height === nextViewport.height
          ? current
          : nextViewport,
      );
      setKeyboardInset((current) =>
        current === nextKeyboardInset ? current : nextKeyboardInset,
      );
    };

    const updateLayout = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(commitLayout);
    };

    commitLayout();

    vv?.addEventListener("resize", updateLayout);
    vv?.addEventListener("scroll", updateLayout);
    window.addEventListener("resize", updateLayout);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      vv?.removeEventListener("resize", updateLayout);
      vv?.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      setIsTextEntryFocused(isTextEntryElement(event.target as Element | null));
    };

    const handleFocusOut = () => {
      window.requestAnimationFrame(() => {
        setIsTextEntryFocused(isTextEntryElement(document.activeElement));
      });
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);

    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  useEffect(() => {
    if (!isTextEntryFocused) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyTop = body.style.top;
    const previousBodyWidth = body.style.width;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.top = previousBodyTop;
      body.style.width = previousBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [isTextEntryFocused]);

  const splitViewportWidth = shouldRotateSplitLayout
    ? viewportSize.height
    : viewportSize.width;
  const splitViewportHeight = shouldRotateSplitLayout
    ? viewportSize.width
    : viewportSize.height;

  const scrollToBottom = () => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      requestAnimationFrame(scrollToBottom),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const playerContent = (
    <>
      {channelStream ? (
        <WebbySalesProPlayer
          ref={playerRef}
          src={channelStream.config.playback_url}
          ariaLabel="Live Webinar Player"
          title={playbackToken.webinar.title}
          onPlaybackStatusChange={setStatus}
          artwork={playbackToken.webinar.media
            .filter((media: WebinarMedia) => media.field_type === WebinarMediaFieldType.THUMBNAIL)
            .map((media: WebinarMedia) => ({ src: media.file_url }))}
        />
      ) : realtimeStream ? (
        <AttendeeStageViewer
          ref={playerRef}
          sessionId={playbackToken.session.id}
          onPlaybackStatusChange={setStatus}
        />
      ) : null}
      <AttendeeCountBadge />
    </>
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
                : "relative grid aspect-video w-full place-items-center text-sm text-white/80 transition-[transform,opacity] duration-300 ease-out"
            }
          >
            {playerContent}
          </div>

          {playbackToken.stream ? (
            <StreamRefreshControl
              className="pointer-events-auto absolute left-1/2 top-3 z-30 -translate-x-1/2"
              onRefresh={handleRefreshStream}
              isRefreshing={isRefreshingStream}
            />
          ) : null}
        </section>

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
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-auto touch-pan-y"
            style={{
              paddingBottom: keyboardInset > 0 ? keyboardInset : undefined,
            }}
          >
            <ChatMessages scrollRef={scrollRef} autoStick />
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
                    : "fixed inset-x-0 bottom-0 top-[20vh] z-30 overflow-y-auto rounded-t-2xl bg-background shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
                }
              >
                <OfferChatBubble />
              </motion.div>
            )}
          </AnimatePresence>

          <footer
            className="shrink-0 border-t border-white/10 bg-neutral-900/95 backdrop-blur"
            style={{
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              transform: keyboardInset > 0 ? `translateY(-${keyboardInset}px)` : undefined,
            }}
          >
            <ChatComposer />
          </footer>
        </section>
      </div>
    </div>
  );
}
