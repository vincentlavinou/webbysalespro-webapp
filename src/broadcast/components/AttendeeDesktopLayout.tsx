"use client";
import { useRef } from "react";
import { AttendeeBroadcastServiceToken } from "../service/type";
import { WebinarChat } from "@/chat/component";
import { WebinarMediaFieldType } from "@/media";
import type { WebinarMedia } from "@/media";
import WebbySalesProPlayer, { type WebbySalesProPlayerHandle } from "./ivs/WebbySalesProPlayer";
import { AttendeeCountBadge } from "../attendee-count/components";
import { StreamRefreshControl } from "./StreamRefreshControl";
import { useAttendeeStreamRefresh } from "../hooks/use-attendee-stream-refresh";

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
  const desktopPlayerWidth = "min(100%, calc((100dvh - 7rem) * 1.7777778))";
  const playerRef = useRef<WebbySalesProPlayerHandle | null>(null);
  const { isRefreshingStream, handleRefreshStream } = useAttendeeStreamRefresh({
    sessionId: broadcast.session.id,
    playerRef,
    enabled: !!broadcast.stream,
  });

  return (
    <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${compact ? "px-2 py-2" : "px-2 py-2 md:px-4 md:py-4"}`}>
      {title && (
        <div className="mb-2 shrink-0 truncate text-sm font-semibold text-foreground">
          {title}
        </div>
      )}
      <div className={`flex flex-1 min-h-0 gap-2 overflow-hidden ${compact ? "flex-col" : "flex-col lg:flex-row"}`}>
        <div className={`flex min-h-0 w-full min-w-0 flex-col ${compact ? "flex-none" : "lg:flex-1"}`}>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <div
              className="relative z-10 w-full max-w-full bg-black"
              style={{ width: compact ? "100%" : desktopPlayerWidth }}
            >
              {broadcast.stream ? (
                <>
                  <WebbySalesProPlayer
                    ref={playerRef}
                    src={broadcast.stream.config.playback_url}
                    ariaLabel="Live Webinar Player"
                    title={broadcast.webinar.title}
                    artwork={broadcast.webinar.media
                      .filter((m: WebinarMedia) => m.field_type === WebinarMediaFieldType.THUMBNAIL)
                      .map((m: WebinarMedia) => ({ src: m.file_url }))}
                  />
                  <AttendeeCountBadge />
                  <StreamRefreshControl
                    className="absolute left-1/2 top-3 z-30 -translate-x-1/2"
                    onRefresh={handleRefreshStream}
                    isRefreshing={isRefreshingStream}
                  />
                </>
              ) : (
                <div className="grid h-full w-full place-items-center bg-black/80 text-white">
                  Waiting for {title} to start...
                </div>
              )}
            </div>
          </div>
        </div>
        {broadcast.stream && (
          <div className={`flex w-full min-h-0 min-w-0 flex-col ${compact ? "flex-1" : "flex-1 lg:w-[320px] lg:min-w-[280px] lg:max-w-[400px]"}`}>
            <WebinarChat
              sessionId={broadcast.session.id}
              registrantId={broadcast.registrant_id}
              region={broadcast.stream?.region}
              currentUserRole={broadcast.role}
            />
          </div>
        )}
      </div>
    </div>
  );
};
