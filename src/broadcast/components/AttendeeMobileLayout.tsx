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
  const [vhBase, setVhBase] = useState<number>(FALLBACK_VIEWPORT.height);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [viewportSize, setViewportSize] =
    useState<ViewportSize>(FALLBACK_VIEWPORT);

  const isLandscape = viewportSize.width > viewportSize.height;

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
      const width = Math.round(vv?.width ?? window.innerWidth);
      const height = Math.round(
        (vv?.height ?? window.innerHeight) - (vv?.offsetTop ?? 0),
      );

      setViewportSize({ width, height });
      setVhBase((prev) => {
        const baseHeight = Math.max(prev, height);
        setKeyboardHeight((current) => {
          const nextHeight = Math.max(0, baseHeight - height);
          return current === nextHeight ? current : nextHeight;
        });
        return baseHeight;
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

  const contentHeight = isLandscape
    ? vhBase
    : Math.max(0, vhBase - playerSectionHeight);

  const chatPaddingBottom = footerHeight + keyboardHeight;

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
  }, [footerHeight, keyboardHeight, isLandscape]);

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
    <div className="h-[100svh] overflow-hidden bg-neutral-900 text-neutral-100">
      <div className={isLandscape ? "flex h-full flex-row" : "flex h-full flex-col"}>
        <section
          ref={playerSectionRef}
          className={
            isLandscape
              ? "flex h-full min-w-0 flex-[1.15] items-stretch bg-black"
              : "shrink-0 bg-black"
          }
        >
          <div
            className={
              isLandscape
                ? "relative flex-1 self-stretch"
                : "relative grid w-full aspect-video place-items-center text-sm text-white/80"
            }
          >
            {playerContent}
          </div>
        </section>

        {broadcast.stream && (
          <WebinarChat
            region={broadcast.stream.region}
            currentUserRole={broadcast.role}
            render={() => (
              <section
                className={
                  isLandscape
                    ? "relative flex min-h-0 flex-1 flex-col border-l border-white/10 bg-background text-foreground"
                    : "relative flex min-h-0 flex-1 flex-col bg-background text-foreground"
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
                      key={`offer-sheet-${isLandscape ? "landscape" : "portrait"}`}
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      exit={{ y: "100%" }}
                      transition={{ type: "spring", damping: 32, stiffness: 300 }}
                      className={
                        isLandscape
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
