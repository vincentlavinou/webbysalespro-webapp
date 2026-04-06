"use client";

import { useRef } from "react";
import { WebinarMediaFieldType } from "@/media";
import type { WebinarMedia } from "@/media";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { AttendeeCountBadge } from "@/broadcast/attendee-count/components/AttendeeCountBadge";
import WebbySalesProPlayer, {
  type WebbySalesProPlayerHandle,
} from "@/playback/player/ivs/WebbySalesProPlayer";
import { StreamRefreshControl } from "@/broadcast/components/StreamRefreshControl";
import { ChatPanel } from "@/chat/component/ChatPanel";
import { usePlaybackRuntime } from "@/playback/hooks/use-playback-runtime";
import { useAttendeeStreamRefresh } from "@/broadcast/hooks/use-attendee-stream-refresh";

type AttendeeDesktopExperienceProps = {
  playbackToken: AttendeeBroadcastServiceToken;
  title?: string;
  compact?: boolean;
};

export function AttendeeDesktopExperience({
  playbackToken,
  title,
  compact = false,
}: AttendeeDesktopExperienceProps) {
  const desktopPlayerWidth = "min(100%, calc((100dvh - 7rem) * 1.7777778))";
  const playerRef = useRef<WebbySalesProPlayerHandle | null>(null);
  const { setStatus } = usePlaybackRuntime();
  const { isRefreshingStream, handleRefreshStream } = useAttendeeStreamRefresh({
    sessionId: playbackToken.session.id,
    playerRef,
    enabled: !!playbackToken.stream,
  });

  return (
    <div className={`flex h-full min-h-0 w-full flex-col overflow-hidden ${compact ? "px-2 py-2" : "px-2 py-2 md:px-4 md:py-4"}`}>
      {title && <div className="mb-2 shrink-0 truncate text-sm font-semibold text-foreground">{title}</div>}
      <div className={`flex flex-1 min-h-0 gap-2 overflow-hidden ${compact ? "flex-col" : "flex-col lg:flex-row"}`}>
        <div className={`flex min-h-0 w-full min-w-0 flex-col ${compact ? "flex-none" : "lg:flex-1"}`}>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
            <div
              className="relative z-10 w-full max-w-full bg-black"
              style={{ width: compact ? "100%" : desktopPlayerWidth }}
            >
              <WebbySalesProPlayer
                ref={playerRef}
                src={playbackToken.stream!.config.playback_url}
                ariaLabel="Live Webinar Player"
                title={playbackToken.webinar.title}
                onPlaybackStatusChange={setStatus}
                artwork={playbackToken.webinar.media
                  .filter((media: WebinarMedia) => media.field_type === WebinarMediaFieldType.THUMBNAIL)
                  .map((media: WebinarMedia) => ({ src: media.file_url }))}
              />
              <AttendeeCountBadge />
              <StreamRefreshControl
                className="absolute left-1/2 top-3 z-30 -translate-x-1/2"
                onRefresh={handleRefreshStream}
                isRefreshing={isRefreshingStream}
              />
            </div>
          </div>
        </div>

        <div className={`flex w-full min-h-0 min-w-0 flex-col ${compact ? "flex-1" : "flex-1 lg:w-[320px] lg:min-w-[280px] lg:max-w-[400px]"}`}>
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
