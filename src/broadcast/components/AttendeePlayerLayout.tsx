"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarChat } from "@/chat/component";
import IVSPlayer from "./views/IVSVideoPlayer";
import clsx from "clsx";
import { ChatPanel } from "@/chat/component/ChatPanel";
import { ChatComposer } from "@/chat/component/ChatComposer";

interface BroadcastUIProps {
    broadcast: AttendeeBroadcastServiceToken;
    title?: string;
}

export const AttendeePlayerLayout = ({ broadcast, title }: BroadcastUIProps) => {
    const [kbOffset, setKbOffset] = useState(0);
    const rootRef = useRef<HTMLDivElement | null>(null);

    // 1) Use dynamic viewport height (100dvh) fallback for browsers that don't support it.
    useEffect(() => {
        const setVHVar = () => {
            const vh = window.visualViewport?.height ?? window.innerHeight;
            document.documentElement.style.setProperty("--app-vh", `${vh}px`);
        };
        setVHVar();
        window.addEventListener("resize", setVHVar);
        window.visualViewport?.addEventListener("resize", setVHVar);
        return () => {
            window.removeEventListener("resize", setVHVar);
            window.visualViewport?.removeEventListener("resize", setVHVar);
        };
    }, []);

    // 2) Track on-screen keyboard height (iOS Safari) so the chat input remains visible.
    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const onVVChange = () => {
            // Keyboard offset = how much the visual viewport is shorter than layout viewport.
            // Also factor in offsetTop (when the viewport is shifted upward).
            const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
            setKbOffset(offset);
        };

        vv.addEventListener("resize", onVVChange);
        vv.addEventListener("scroll", onVVChange);
        onVVChange();

        return () => {
            vv.removeEventListener("resize", onVVChange);
            vv.removeEventListener("scroll", onVVChange);
        };
    }, []);

    const hasStream = !!broadcast.stream;

    if (!hasStream) {
        return <div>Loading...</div>
    }

    return (
        <div
            ref={rootRef}
            className={clsx(
                // Root: use the dynamic viewport height with a 100dvh-capable fallback.
                // `min-h-0` is critical so children with overflow can actually scroll.
                "w-full min-h-0 overflow-hidden lg:px-4",
                // Portrait: stack, Landscape/desktop: row
                "flex flex-col lg:flex-row"
            )}
            style={{
                // Prefer 100dvh; fall back to CSS var (visual viewport) and then 100vh.
                height: "100dvh",
                // For older browsers, this var keeps things sane:
                // @supports not (height: 100dvh) would use the var.
                // Many mobile browsers now support 100dvh; leaving both is robust.
                // (No harm using both; the browser will pick the most specific.)
                ["--kb-offset" as string]: `${kbOffset}px`,
                paddingBottom: `max(env(safe-area-inset-bottom, 0px), var(--kb-offset))`,
                paddingTop: "env(safe-area-inset-top, 0px)",
            }}
        >
            <Script src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js" />

            {/* LEFT / TOP: Video + header (sticky) */}
            <section
                className={clsx(
                    "relative flex flex-col min-h-0",
                    // Portrait: full width; Desktop: grow
                    "w-full lg:flex-1"
                )}
            // Make the section itself scrollable ONLY in landscape when the chat sits to the right.
            // In portrait, we let the chat column handle the scroll.
            >
                {/* Sticky video at the top */}
                <div className="sticky top-0 z-20 bg-black">
                    {broadcast.stream && (
                        <IVSPlayer
                            src={broadcast.stream.config.playback_url}
                            poster="/poster.jpg"
                            autoPlay
                            muted
                            showStats
                            ariaLabel="Live Webinar Player"
                        // Keep the player responsive with an aspect box
                        />
                    )}
                    {!hasStream && (
                        <div className="aspect-video w-full bg-black/80 grid place-items-center text-white">
                            Waiting for stream…
                        </div>
                    )}
                </div>

                {/* Optional title / controls under the video (shown on mobile portrait) */}
                <div className="z-20 md:hidden border-b px-3 py-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <h1 className="text-xl font-semibold tracking-tight line-clamp-2">{title}</h1>
                </div>
            </section>

            {/* RIGHT / BOTTOM: Chat column */}
            <section
                className={clsx(
                    "flex flex-col min-h-0",
                    // Portrait: full width under video; Desktop: fixed width right rail
                    "w-full lg:w-[360px] lg:min-w-[320px] lg:max-w-[420px]"
                )}
            >
                {broadcast.stream && <WebinarChat
                    region={broadcast.stream.region}
                    render={() => (
                        <div className="flex flex-col min-h-0 h-full">
                            {/* Messages: scrollable */}
                            <ChatPanel hideComposer className="flex-1 min-h-0 px-2" />

                            {/* Sticky composer at the bottom so video + input are always visible */}
                            <div className="sticky bottom-0 z-20">
                                <ChatComposer />
                            </div>
                        </div>
                    )}
                />}

            </section>

            {/* Desktop header (optional) */}
            <aside className="hidden lg:block lg:absolute lg:top-2 lg:left-2">
                {/* Could place a small breadcrumb/title if you want */}
            </aside>
        </div>
    );
};
