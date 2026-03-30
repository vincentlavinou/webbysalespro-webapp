"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";
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
import WebbySalesProPlayer from "./ivs/WebbySalesProPlayer";

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

  const playerSectionRef = useRef<HTMLElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [playerSectionHeight, setPlayerSectionHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportSize, setViewportSize] =
    useState<ViewportSize>(readLayoutViewport);

  const {
    enterImmersive,
    exitImmersive,
    isImmersive,
    layoutState,
    shouldRotatePortraitImmersive,
  } = useImmersiveLayout(viewportSize);

  const isSplitLayout = layoutState === "split";
  const shouldRotateImmersivePlayer = shouldRotatePortraitImmersive;

  useEffect(() => {
    const measure = () => {
      setPlayerSectionHeight(playerSectionRef.current?.offsetHeight ?? 0);
      setFooterHeight(footerRef.current?.offsetHeight ?? 0);
    };

    measure();

    const playerObserver = playerSectionRef.current
      ? new ResizeObserver(measure)
      : null;
    const footerObserver = footerRef.current ? new ResizeObserver(measure) : null;

    if (playerSectionRef.current) {
      playerObserver?.observe(playerSectionRef.current);
    }

    if (footerRef.current) {
      footerObserver?.observe(footerRef.current);
    }

    window.addEventListener("resize", measure);

    return () => {
      playerObserver?.disconnect();
      footerObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;

    const updateViewport = () => {
      const layoutViewport = readLayoutViewport();
      const visibleHeight = Math.round(
        (vv?.height ?? layoutViewport.height) - (vv?.offsetTop ?? 0),
      );

      setViewportSize((current) => {
        if (
          current.width === layoutViewport.width &&
          current.height === layoutViewport.height
        ) {
          return current;
        }

        return layoutViewport;
      });

      setKeyboardHeight((current) => {
        const nextHeight = Math.max(0, layoutViewport.height - visibleHeight);
        return current === nextHeight ? current : nextHeight;
      });
    };

    updateViewport();

    vv?.addEventListener("resize", updateViewport);
    vv?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      vv?.removeEventListener("resize", updateViewport);
      vv?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const contentHeight = isSplitLayout
    ? viewportSize.height
    : Math.max(0, viewportSize.height - playerSectionHeight);

  const chatPaddingBottom = footerHeight + keyboardHeight;
  const immersiveViewportWidth = shouldRotateImmersivePlayer
    ? viewportSize.height
    : viewportSize.width;
  const immersiveViewportHeight = shouldRotateImmersivePlayer
    ? viewportSize.width
    : viewportSize.height;
  const immersivePlayerWidth =
    immersiveViewportWidth > 0 && immersiveViewportHeight > 0
      ? Math.min(immersiveViewportWidth, immersiveViewportHeight * (16 / 9))
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
    requestAnimationFrame(scrollToBottom);
  }, [footerHeight, isSplitLayout, keyboardHeight]);

  const playerContent = broadcast.stream ? (
    <>
      <WebbySalesProPlayer
        src={broadcast.stream.config.playback_url}
        poster="/poster.jpg"
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

  return (
    <div className="relative h-[100svh] overflow-hidden bg-neutral-900 text-neutral-100">
      <div
        className={
          isImmersive
            ? "h-full transition-[opacity] duration-300 ease-out"
            : isSplitLayout
              ? "flex h-full flex-row transition-[opacity] duration-300 ease-out"
              : "flex h-full flex-col transition-[opacity] duration-300 ease-out"
        }
      >
        <section
          ref={playerSectionRef}
          className={
            isImmersive
              ? "fixed inset-0 z-40 flex items-center justify-center bg-black transition-[background-color,opacity] duration-300 ease-out"
              : isSplitLayout
                ? "relative flex h-full min-w-0 flex-[1.15] items-stretch bg-black transition-[flex-basis,opacity] duration-300 ease-out"
                : "relative shrink-0 bg-black transition-[opacity] duration-300 ease-out"
          }
        >
          <div
            className={
              isImmersive
                ? "relative flex items-center justify-center transition-[transform,width,opacity] duration-300 ease-out"
                : isSplitLayout
                  ? "relative flex flex-1 items-center justify-center self-stretch overflow-hidden transition-[transform,opacity] duration-300 ease-out"
                  : "relative grid w-full aspect-video place-items-center text-sm text-white/80 transition-[transform,opacity] duration-300 ease-out"
            }
            style={
              isImmersive
                ? {
                    width: immersivePlayerWidth || undefined,
                    transform: shouldRotateImmersivePlayer ? "rotate(90deg)" : undefined,
                    transformOrigin: "center center",
                  }
                : undefined
            }
          >
            {playerContent}
          </div>

          {broadcast.stream && (
            <div
              className={
                isImmersive
                  ? "pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-end p-4 transition-[opacity,transform] duration-200 ease-out"
                  : "pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-end p-3 transition-[opacity,transform] duration-200 ease-out"
              }
            >
              <button
                type="button"
                onClick={isImmersive ? exitImmersive : enterImmersive}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition-all duration-200 ease-out hover:scale-105 hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/60"
                aria-label={isImmersive ? "Exit immersive mode" : "Enter immersive mode"}
              >
                {isImmersive ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </section>

        {broadcast.stream && !isImmersive && (
          <WebinarChat
            region={broadcast.stream.region}
            currentUserRole={broadcast.role}
            render={() => (
              <section
                className={
                  isSplitLayout
                    ? "relative flex min-h-0 flex-1 flex-col border-l border-white/10 bg-background text-foreground transition-[opacity,transform] duration-300 ease-out"
                    : "relative flex min-h-0 flex-1 flex-col bg-background text-foreground transition-[opacity,transform] duration-300 ease-out"
                }
                style={{ height: contentHeight }}
              >
                <main
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto overscroll-contain touch-pan-y"
                  style={{ paddingBottom: chatPaddingBottom }}
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

                <footer
                  ref={footerRef}
                  className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-neutral-900/95 backdrop-blur"
                  style={{ bottom: keyboardHeight }}
                >
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
