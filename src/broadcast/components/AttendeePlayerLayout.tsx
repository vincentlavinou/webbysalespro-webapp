"use client";

import Script from "next/script";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarChat } from "@/chat/component";
import IVSPlayer from "./views/IVSVideoPlayer";

interface BroadcastUIProps {
    broadcast: AttendeeBroadcastServiceToken;
    title?: string;
}

export const AttendeePlayerLayout = ({ broadcast, title }: BroadcastUIProps) => {

    return (
        <div className="flex flex-col w-full h-[90vh] overflow-hidden md:px-4">
            <Script src="https://web-broadcast.live-video.net/1.6.0/amazon-ivs-web-broadcast.js" />

            {/* Main area layout: stacked on mobile, side-by-side on desktop */}
            <div className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-hidden">
                {/* Video + Controls + Chat container (stacked on mobile) */}
                <div className="flex flex-col flex-1 min-h-0 lg:flex-row overflow-hidden gap-2">

                    {/* Video + Controls (fixed above chat) */}
                    <div className="flex flex-col w-full lg:flex-1 max-h-[calc(100vh-100px)] min-h-0">
                        {/* Video sticky at top */}
                        <div className="sticky top-0 z-10 bg-black">
                            {broadcast.stream ? <IVSPlayer
                                src={broadcast.stream.config.playback_url}
                                poster="/poster.jpg"
                                autoPlay
                                muted
                                showStats
                                ariaLabel="Live Webinar Player"
                            /> : <></>}
                        </div>

                        {/* Controls below video (mobile) */}
                        <div className="pt-2 border-t px-2 md:hidden">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {title}
                            </h1>
                        </div>
                    </div>

                    {/* Chat container (grows under controls) */}
                    <div className="flex flex-col w-full lg:w-[320px] min-w-[280px] lg:max-w-[400px] flex-1 overflow-y-auto px-2">
                        {broadcast.stream ? <WebinarChat region={broadcast.stream.region} /> : <></>}
                    </div>
                </div>
            </div>
        </div>
    );
};