"use client";

import React, { useEffect, useRef, useState } from "react";
import { Player, PlayerError, PlayerEventType, PlayerState } from "amazon-ivs-player";

type Props = {
    /** Your IVS playback URL: e.g., https://xxx.live-video.net/xxx.m3u8 */
    src: string;
    /** Optional poster image */
    poster?: string;
    /** Autoplay on mount (muted to satisfy browser policies) */
    autoPlay?: boolean;
    /** Start muted (recommended for autoplay) */
    muted?: boolean;
    /** Show minimal stats (latency, bitrate, resolution) */
    showStats?: boolean;
    /** Provide a label for A11y / testing */
    ariaLabel?: string;
};

export default function IVSPlayer({
    src,
    poster,
    autoPlay = true,
    muted = true,
    showStats = true,
    ariaLabel = "IVS player",
}: Props) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<Player | null>(null);

    const [stats, setStats] = useState<{
        latency?: number;
        bitrate?: number;
        resolution?: string;
        state?: string;
    }>({});

    useEffect(() => {
        let disposed = false;

        async function setup() {
            if (!videoRef.current) return;

            // Dynamically import to avoid SSR window errors
            const ivs = await import("amazon-ivs-player");
            if (disposed) return;

            // If the environment supports the IVS tech
            if (ivs.isPlayerSupported) {
                const player = ivs.create({
                    wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
                    wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
                });
                playerRef.current = player;

                player.attachHTMLVideoElement(videoRef.current);

                // Initial config
                player.setAutoplay(autoPlay);
                player.setMuted(muted);
                player.load(src);
                player.setAutoQualityMode(true)

                const onState = () => {
                    setStats((s) => ({
                        ...s,
                        latency: player.getLiveLatency(),
                        bitrate: Math.round(player.getPlaybackRate() / 1000), // kbps
                        resolution: `${player.getDisplayWidth()}x${player.getDisplayHeight()}`,
                        state: player.getState(),
                    }));
                };

                const onError = (e: PlayerError) => {
                    console.error("[IVS] Player Error:", e);
                };

                const onMetadata = (m: unknown) => {
                    // Timed-metadata (ID3); IVS also surfaces text-metadata cues here
                    // m.text, m.type, m.time are common fields
                    // Example: forward to your analytics bus or state
                    // console.log("[IVS] Timed Metadata:", m);
                    console.log(m)
                };

                player.addEventListener(PlayerState.READY, onState);
                player.addEventListener(PlayerState.READY, () => {
                    try {
                        const v = videoRef.current!;
                        const keep = v.controls;
                        v.controls = false; // workaround for setQuality quirk
                        const qs = player.getQualities();
                        const best = qs.sort((a, b) => b.bitrate - a.bitrate)[0];
                        if (best) player.setQuality(best);
                        v.controls = keep;
                    } catch { }
                });

                player.addEventListener(PlayerState.PLAYING, onState);
                player.addEventListener(PlayerState.BUFFERING, onState);
                player.addEventListener(PlayerState.IDLE, onState);
                player.addEventListener(PlayerState.ENDED, onState);
                player.addEventListener(PlayerEventType.ERROR, onError);
                player.addEventListener(PlayerEventType.TEXT_METADATA_CUE, onMetadata); // important for offers/SEI-like cues

                // Attempt play if allowed by browser policy
                if (autoPlay) {
                    // play() must be called on the video element in some browsers
                    try {
                        await videoRef.current.play();
                    } catch (e) {
                        // Autoplay might be blocked—UI will still show a play button
                        console.error(e)
                    }
                }
            } else {
                // Optional: fallback to Hls.js for generic HLS if desired
                // const Hls = (await import("hls.js")).default;
                // if (Hls.isSupported()) { ... }
                console.warn("IVS Player not supported in this browser.");
            }
        }

        setup();

        return () => {
            disposed = true;
            try {
                playerRef.current?.pause();
                playerRef.current?.delete();
            } catch (e) {
                console.error(e)
            }
            playerRef.current = null;
        };
    }, [src, autoPlay, muted]);

    return (
        <div className="w-full">
            {/* Player Shell */}
            <div className="relative w-full overflow-hidden rounded-xl border bg-black shadow-sm max-w-[1280px]">
                {/* Maintain aspect ratio; tweak as needed */}
                <div className="aspect-video">
                    <video
                        ref={videoRef}
                        poster={poster}
                        playsInline
                        controls
                        muted={muted}
                        preload="auto"
                        aria-label={ariaLabel}
                        className="h-full w-full object-contain"
                    />
                </div>

                {/* Mini overlay stats (optional) */}
                {showStats && (
                    <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                        <div>State: {stats.state ?? "…"}</div>
                        <div>
                            Latency:{" "}
                            {typeof stats.latency === "number"
                                ? `${stats.latency.toFixed(1)}s`
                                : "…"}
                        </div>
                        <div>Bitrate: {stats.bitrate ? `${stats.bitrate} kbps` : "…"}</div>
                        <div>Res: {stats.resolution ?? "…"}</div>
                    </div>
                )}
            </div>

            {/* Controls row (you can swap these for shadcn/ui buttons) */}
            <div className="mt-3 flex items-center gap-2">
                <button
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={() => playerRef.current?.play()}
                >
                    Play
                </button>
                <button
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={() => playerRef.current?.pause()}
                >
                    Pause
                </button>
                <button
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={() => {
                        const cur = playerRef.current;
                        if (!cur) return;
                        cur.setMuted(!cur.isMuted());
                    }}
                >
                    Toggle Mute
                </button>
                <button
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                    onClick={() => {
                        const cur = playerRef.current;
                        if (!cur) return;
                        // Jumps to live edge for low-latency streams
                        cur.seekTo(0);
                    }}
                >
                    Go Live
                </button>
            </div>
        </div>
    );
}
