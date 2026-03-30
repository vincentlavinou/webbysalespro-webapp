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
        <div className={`flex flex-col w-full overflow-hidden ${compact ? "h-[100svh]" : "h-[90vh] md:px-4"}`}>
            <div className={`flex flex-1 min-h-0 overflow-hidden gap-2 ${compact ? "flex-col px-2 py-2" : "flex-col lg:flex-row"}`}>

                <div className={`flex flex-col w-full min-h-0 ${compact ? "flex-none" : "lg:flex-1 max-h-[calc(100vh-100px)]"}`}>
                    <div className={`z-10 bg-black relative ${compact ? "shrink-0" : "sticky top-0"}`}>
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
                {broadcast.stream && <div className={`flex flex-col w-full flex-1 min-h-0 ${compact ? "" : "lg:w-[320px] min-w-[280px] lg:max-w-[400px] overflow-y-auto px-2"}`}>
                        <WebinarChat
                          region={broadcast.stream?.region}
                          currentUserRole={broadcast.role}
                        />
                    </div>}
            </div>
        </div>
    );
};
