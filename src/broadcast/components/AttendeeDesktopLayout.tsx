"use client";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarChat } from "@/chat/component";
import IVSPlayer from "./views/IVSVideoPlayer";

interface AttendeeDesktopLayoutProps {
    broadcast: AttendeeBroadcastServiceToken;
    title?: string;
    onMetadataText: (text: string) => Promise<void>
}


export const AttendeeDesktopLayout = ({ broadcast, title, onMetadataText }: AttendeeDesktopLayoutProps) => {
    return (
        <div className="flex flex-col w-full h-[90vh] overflow-hidden md:px-4">
            <div className="flex flex-col flex-1 min-h-0 lg:flex-row overflow-hidden gap-2">

                <div className="flex flex-col w-full lg:flex-1 max-h-[calc(100vh-100px)] min-h-0">
                    <div className="sticky top-0 z-10 bg-black">
                        {broadcast.stream ? (
                            <IVSPlayer
                                src={broadcast.stream.config.playback_url}
                                poster="/poster.jpg"
                                onMetadataText={onMetadataText}
                                autoPlay
                                showStats
                                ariaLabel="Live Webinar Player"
                            />
                        ) : (
                            <div className="w-full h-full bg-black/80 grid place-items-center text-white">
                            Waiting for {title} to start...
                        </div>
                        )}
                    </div>
                </div>
                                    {/* Chat container (grows under controls) */}
                    {broadcast.stream && <div className="flex flex-col w-full lg:w-[320px] min-w-[280px] lg:max-w-[400px] flex-1 overflow-y-auto px-2">
                        <WebinarChat region={broadcast.stream?.region} />
                    </div>}
            </div>
        </div>
    );
};