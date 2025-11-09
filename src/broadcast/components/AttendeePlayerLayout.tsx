"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarChat } from "@/chat/component";
import IVSPlayer from "./views/IVSVideoPlayer";
import clsx from "clsx";
import { ChatPanel } from "@/chat/component/ChatPanel";
import { ChatComposer } from "@/chat/component/ChatComposer";
import { WebinarLoadingView } from "./views/WebinarLoadingView";

interface BroadcastUIProps {
  broadcast: AttendeeBroadcastServiceToken;
  title?: string;
}

export const AttendeePlayerLayout = ({ broadcast, title }: BroadcastUIProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // --- Detect mobile vs desktop (lg breakpoint-ish) ---
  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 1024); // Tailwind lg = 1024px
    };
    updateIsMobile();
    window.addEventListener("resize", updateIsMobile);
    return () => window.removeEventListener("resize", updateIsMobile);
  }, []);

  // --- Track keyboard overlap on mobile using visualViewport (Safari-friendly) ---
  useEffect(() => {
    if (!isMobile) {
      setKeyboardHeight(0);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const handleViewportChange = () => {
      const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(overlap);
    };

    handleViewportChange();
    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);

    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
    };
  }, [isMobile]);

  // --- Helper: scroll chat to bottom ---
  const scrollToBottom = () => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // Initial scroll to bottom once chat container mounts
  useEffect(() => {
    if (!isMobile) return; // only auto-scroll on mobile
    // small delay so ChatPanel has rendered
    const id = window.setTimeout(scrollToBottom, 50);
    return () => window.clearTimeout(id);
  }, [isMobile]);

  // When keyboard height changes (keyboard opens/closes), keep latest message in view
  useEffect(() => {
    if (!isMobile) return;
    requestAnimationFrame(scrollToBottom);
  }, [keyboardHeight, isMobile]);

  // Observe DOM changes in the chat container (new messages) and auto-scroll on mobile
  useEffect(() => {
    if (!isMobile) return;
    const container = chatScrollRef.current;
    if (!container) return;

    const observer = new MutationObserver(() => {
      // whenever children change (new message), go to bottom
      requestAnimationFrame(scrollToBottom);
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [isMobile]);

  const hasStream = !!broadcast.stream;
  if (!hasStream) return <WebinarLoadingView />;

  return (
    <div
      ref={rootRef}
      className={clsx(
        "w-full bg-background text-foreground",
        // mobile: column; desktop: row
        "flex flex-col lg:flex-row",
        "min-h-screen lg:min-h-0"
      )}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <Script src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js" />

      {/* VIDEO AREA */}
      {isMobile ? (
        // MOBILE: fixed header video, like your KeyboardSafariTestPage
        <header className="fixed top-0 left-0 right-0 z-20 bg-black">
          <div className="w-full aspect-video">
            {broadcast.stream ? (
              <IVSPlayer
                src={broadcast.stream.config.playback_url}
                poster="/poster.jpg"
                autoPlay
                muted
                showStats
                ariaLabel="Live Webinar Player"
              />
            ) : (
              <div className="w-full h-full bg-black/80 grid place-items-center text-white">
                Waiting for stream…
              </div>
            )}
          </div>
        </header>
      ) : (
        // DESKTOP: original left section with sticky video
        <section className={clsx("relative flex flex-col min-h-0", "w-full lg:flex-1")}>
          <div className="sticky top-0 z-20 bg-black">
            {broadcast.stream ? (
              <IVSPlayer
                src={broadcast.stream.config.playback_url}
                poster="/poster.jpg"
                autoPlay
                muted
                showStats
                ariaLabel="Live Webinar Player"
              />
            ) : (
              <div className="aspect-video w-full bg-black/80 grid place-items-center text-white">
                Waiting for stream…
              </div>
            )}
          </div>

          {/* Optional title under video */}
          <div className="z-20 md:hidden border-b px-3 py-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h1 className="text-xl font-semibold tracking-tight line-clamp-2">{title}</h1>
          </div>
        </section>
      )}

      {/* CHAT COLUMN */}
      <section
        className={clsx(
          "flex flex-col",
          isMobile
            ? "w-full" // mobile: full width under fixed video
            : "min-h-0 w-full lg:w-[360px] lg:min-w-[320px] lg:max-w-[420px]" // desktop: right rail
        )}
      >
        {broadcast.stream && (
          <WebinarChat
            region={broadcast.stream.region}
            render={() =>
              isMobile ? (
                // --- MOBILE LAYOUT (KeyboardSafariTestPage-style) ---
                <>
                  {/* Messages area: scrollable, with top padding to clear fixed video */}
                  <main
                    ref={chatScrollRef}
                    className="px-3 pb-24 space-y-2 overflow-y-auto"
                    style={{
                      // top padding ~= video height; tweak to exact IVS aspect if needed
                      paddingTop: "230px",
                    }}
                  >
                    <ChatPanel hideComposer />
                  </main>

                  {/* Composer: fixed bottom, lifted by keyboardHeight */}
                  <footer
                    className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-background/95 backdrop-blur"
                    style={{
                      transform: `translateY(${-keyboardHeight}px)`,
                      transition: "transform 180ms ease-out",
                      paddingBottom: "env(safe-area-inset-bottom, 0px)",
                    }}
                  >
                    <div className="mx-auto w-full max-w-3xl p-3">
                      <ChatComposer />
                    </div>
                  </footer>
                </>
              ) : (
                // --- DESKTOP LAYOUT (original behavior) ---
                <div className="flex flex-col min-h-0 h-full">
                  {/* Messages: scrollable inside chat column */}
                  <div
                    ref={chatScrollRef}
                    className="flex-1 min-h-0 px-2 overflow-y-auto"
                  >
                    <ChatPanel hideComposer />
                    {/* spacer so last message isn't behind composer */}
                    <div className="h-20" />
                  </div>

                  {/* Sticky composer at bottom of chat column */}
                  <div
                    className="sticky bottom-0 z-20 bg-background/90 backdrop-blur border-t"
                    style={{
                      paddingBottom: "env(safe-area-inset-bottom, 0px)",
                    }}
                  >
                    <ChatComposer />
                  </div>
                </div>
              )
            }
          />
        )}
      </section>

      {/* Desktop header (optional overlay title) */}
      {!isMobile && (
        <aside className="hidden lg:block lg:absolute lg:top-2 lg:left-2">
          <div className="border-b px-3 py-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <h1 className="text-xl font-semibold tracking-tight line-clamp-2">{title}</h1>
          </div>
        </aside>
      )}
    </div>
  );
};
