"use client";
import { useEffect, useRef, useState } from "react";
import { AttendeeBroadcastServiceToken } from "../service/type";
import IVSPlayer from "./views/IVSVideoPlayer";
import { ChatComposer } from "@/chat/component/ChatComposer";
import { ChatMessages } from "@/chat/component/ChatMessages";
import { WebinarChat } from "@/chat/component";

interface AttendeeMobileLayoutProps {
    broadcast: AttendeeBroadcastServiceToken;
    title?: string;
    onMetadataText: (text: string) => Promise<void>
}

export default function AttendeeMobileLayout({ broadcast, title, onMetadataText }: AttendeeMobileLayoutProps) {

    const headerRef = useRef<HTMLDivElement | null>(null);
    const footerRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);

    const [headerH, setHeaderH] = useState(0);
    const [footerH, setFooterH] = useState(0);

    // Freeze a baseline viewport height that does NOT shrink with keyboard.
    const [vhBase, setVhBase] = useState<number>(() => 500);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // measure header/footer
    useEffect(() => {
        const measure = () => {
            setHeaderH(headerRef.current?.offsetHeight ?? 0);
            setFooterH(footerRef.current?.offsetHeight ?? 0);
        };
        measure();

        const roH = headerRef.current ? new ResizeObserver(measure) : null;
        const roF = footerRef.current ? new ResizeObserver(measure) : null;
        roH?.observe(headerRef.current!);
        roF?.observe(footerRef.current!);

        window.addEventListener("resize", measure);
        return () => {
            roH?.disconnect();
            roF?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, []);

    // visualViewport handling:
    // - keep vhBase as the LARGEST height seen (ignores keyboard shrink)
    // - compute keyboardHeight as (vhBase - current visual height)
    useEffect(() => {
        const vv = window.visualViewport;

        const updateHeights = () => {
            const currentVH = (vv?.height ?? window.innerHeight) - (vv?.offsetTop ?? 0);
            setVhBase(prev => Math.max(prev, currentVH)); // freeze to largest
            setKeyboardHeight(Math.max(0, (vhBase || currentVH) - currentVH));
        };

        updateHeights();
        vv?.addEventListener("resize", updateHeights);
        vv?.addEventListener("scroll", updateHeights);
        window.addEventListener("resize", updateHeights);

        return () => {
            vv?.removeEventListener("resize", updateHeights);
            vv?.removeEventListener("scroll", updateHeights);
            window.removeEventListener("resize", updateHeights);
        };
    }, [vhBase]);

    // constant height between header and footer (doesn't shrink with keyboard)
    const betweenHF = Math.max(0, vhBase - headerH - footerH);

    // scroll helpers
    const scrollToBottom = () => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;

    };

    useEffect(() => { scrollToBottom(); }, []);
    useEffect(() => { requestAnimationFrame(scrollToBottom); }, [footerH, keyboardHeight]);

    return (
        <div className="bg-neutral-900 text-neutral-100 h-[100svh] overflow-hidden">
            <header ref={headerRef} className="bg-black">
                <div className="w-full aspect-video grid place-items-center text-sm text-white/80">
                    {broadcast.stream ? (
                        <IVSPlayer
                            src={broadcast.stream.config.playback_url}
                            poster="/poster.jpg"
                            autoPlay
                            showStats
                            ariaLabel="Live Webinar Player"
                            onMetadataText={onMetadataText}
                        />
                    ) : (
                        <div className="w-full h-full bg-black/80 grid place-items-center text-white">
                            Waiting for {title} to start...
                        </div>
                    )}
                </div>
            </header>

            {broadcast.stream && (
                <WebinarChat
                    region={broadcast.stream.region}
                    render={() => {
                        return (<>

                            {/* MAIN: fixed height that DOES NOT change with keyboard; add bottom padding for lifted footer */}
                            <main
                                ref={scrollRef}
                                className="
                                    px-3
                                    space-y-2
                                    overflow-y-auto
                                    overscroll-contain
                                    touch-pan-y
                                    bg-background
                                    text-foreground
                                "
                                style={{
                                    height: betweenHF, // constant height
                                }}
                            >
                                <ChatMessages scrollRef={scrollRef} autoStick={true} />
                            </main>

                            {/* FOOTER: lift by keyboard height */}
                            <footer
                                ref={footerRef}
                                className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-neutral-900/95 backdrop-blur"
                            >
                                <ChatComposer />
                            </footer>
                        </>)
                    }}
                />
            )}


        </div>
    );
}
