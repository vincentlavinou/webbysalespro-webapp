"use client";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarChat } from "@/chat/component";
import { VideoInjectionPlayer } from "@/video-injection";
import { WebinarMediaFieldType } from "@/media";
import type { WebinarMedia } from "@/media";
import WebbySalesProIVSPlayer from "./ivs/WebbySalesProIVSPlayer";
import { useVideoInjectionPlayer } from "@/video-injection/hooks/use-video-injection-player";

interface AttendeeDesktopLayoutProps {
    broadcast: AttendeeBroadcastServiceToken;
    accessToken?: string
    title?: string;
}


export const AttendeeDesktopLayout = ({ accessToken, broadcast, title }: AttendeeDesktopLayoutProps) => {
    const { isActive: injectionActive } = useVideoInjectionPlayer();
    return (
        <div className="flex flex-col w-full h-[90vh] overflow-hidden md:px-4">
            <div className="flex flex-col flex-1 min-h-0 lg:flex-row overflow-hidden gap-2">

                <div className="flex flex-col w-full lg:flex-1 max-h-[calc(100vh-100px)] min-h-0">
                    <div className="sticky top-0 z-10 bg-black relative">
                        {broadcast.stream ? (
                            <WebbySalesProIVSPlayer
                                src={broadcast.stream.config.playback_url}
                                poster="/poster.jpg"
                                autoPlay
                                showStats
                                ariaLabel="Live Webinar Player"
                                title={broadcast.webinar.title}
                                artwork={broadcast.webinar.media
                                    .filter((m: WebinarMedia) => m.field_type === WebinarMediaFieldType.THUMBNAIL)
                                    .map((m: WebinarMedia) => ({ src: m.file_url }))}
                                keepAlive={injectionActive}
                            />
                        ) : (
                            <div className="w-full h-full bg-black/80 grid place-items-center text-white">
                            Waiting for {title} to start...
                        </div>
                        )}
                        <VideoInjectionPlayer />
                    </div>
                </div>
                                    {/* Chat container (grows under controls) */}
                    {broadcast.stream && <div className="flex flex-col w-full lg:w-[320px] min-w-[280px] lg:max-w-[400px] flex-1 overflow-y-auto px-2">
                        <WebinarChat token={accessToken} region={broadcast.stream?.region} />
                    </div>}
            </div>
        </div>
    );
};