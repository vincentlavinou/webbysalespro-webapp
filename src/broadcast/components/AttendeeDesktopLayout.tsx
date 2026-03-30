"use client";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarChat } from "@/chat/component";
import { WebinarMediaFieldType } from "@/media";
import type { WebinarMedia } from "@/media";
import WebbySalesProPlayer from "./ivs/WebbySalesProPlayer";
import { AttendeeCountBadge } from "../attendee-count/components";

interface AttendeeDesktopLayoutProps {
    broadcast: AttendeeBroadcastServiceToken;
    title?: string;
    compact?: boolean;
}


export const AttendeeDesktopLayout = ({
    broadcast,
    title,
    compact = false,
}: AttendeeDesktopLayoutProps) => {
    return (
        <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${compact ? "px-2 py-2" : "px-2 py-2 md:px-4 md:py-4"}`}>
            <div className={`flex flex-1 min-h-0 overflow-hidden gap-2 ${compact ? "flex-col" : "flex-col lg:flex-row"}`}>

                <div className={`flex min-h-0 w-full flex-col ${compact ? "flex-none" : "lg:flex-1"}`}>
                    <div className="relative z-10 bg-black">
                        {broadcast.stream ? (
                            <>
                                <WebbySalesProPlayer
                                    src={broadcast.stream.config.playback_url}
                                    poster="/poster.jpg"
                                    ariaLabel="Live Webinar Player"
                                    title={broadcast.webinar.title}
                                    artwork={broadcast.webinar.media
                                        .filter((m: WebinarMedia) => m.field_type === WebinarMediaFieldType.THUMBNAIL)
                                        .map((m: WebinarMedia) => ({ src: m.file_url }))}
                                />
                                <AttendeeCountBadge />
                            </>
                        ) : (
                            <div className="w-full h-full bg-black/80 grid place-items-center text-white">
                            Waiting for {title} to start...
                        </div>
                        )}
                        {/* <VideoInjectionPlayer /> */}
                    </div>
                </div>
                {broadcast.stream && <div className={`flex w-full min-h-0 min-w-0 flex-col ${compact ? "flex-1" : "flex-1 lg:w-[320px] lg:min-w-[280px] lg:max-w-[400px]"}`}>
                        <WebinarChat
                          region={broadcast.stream?.region}
                          currentUserRole={broadcast.role}
                        />
                    </div>}
            </div>
        </div>
    );
};
