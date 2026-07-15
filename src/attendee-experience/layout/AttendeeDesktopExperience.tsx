"use client";

import { useRef } from "react";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { AttendeeCountBadge } from "@/broadcast/attendee-count/components/AttendeeCountBadge";
import WebbySalesProPlayer from "@/playback/player/ivs/WebbySalesProPlayer";
import { StreamRefreshControl } from "@/broadcast/components/StreamRefreshControl";
import { ChatPanel } from "@/chat/component/ChatPanel";
import { usePlaybackRuntime } from "@/playback/hooks/use-playback-runtime";
import { useHavingTroubleIndicator } from "@/playback/hooks/use-having-trouble-indicator";
import {
  type AttendeeStreamRecoveryHandle,
  useAttendeeStreamRefresh,
} from "@/broadcast/hooks/use-attendee-stream-refresh";
import { AttendeeStageViewer } from "@/playback/stage/AttendeeStageViewer";
import { getPlaybackArtwork } from "@/playback/client/get-playback-artwork";

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
  const playerRef = useRef<AttendeeStreamRecoveryHandle | null>(null);
  const { status, setStatus } = usePlaybackRuntime();
  const showTroubleIndicator = useHavingTroubleIndicator(status);
  const channelStream =
    playbackToken.stream?.kind === "channel" ? playbackToken.stream : undefined;
  const realtimeStream =
    playbackToken.stream?.kind === "realtime" ? playbackToken.stream : undefined;
  const { isRefreshingStream, handleRefreshStream } = useAttendeeStreamRefresh({
    sessionId: playbackToken.session.id,
    playerRef,
    enabled: !!playbackToken.stream,
    // Realtime stages stay connected via PersistentStagePlaybackProvider, so a
    // reconnect on return would just cause a visible refresh. Still re-fetch
    // data on return, just don't tear down the stage.
    reconnectPlayerOnReturn: !realtimeStream,
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
              {channelStream ? (
                <WebbySalesProPlayer
                  ref={playerRef}
                  src={channelStream.config.playback_url}
                  ariaLabel="Live Webinar Player"
                  title={playbackToken.webinar.title}
                  onPlaybackStatusChange={setStatus}
                  artwork={getPlaybackArtwork(playbackToken.webinar.media)}
                />
              ) : realtimeStream ? (
                <AttendeeStageViewer
                  ref={playerRef}
                  sessionId={playbackToken.session.id}
                  onPlaybackStatusChange={setStatus}
                />
              ) : null}
              <AttendeeCountBadge />
              {playbackToken.stream && showTroubleIndicator ? (
                <StreamRefreshControl
                  className="absolute left-1/2 top-3 z-30 -translate-x-1/2"
                  onRefresh={handleRefreshStream}
                  isRefreshing={isRefreshingStream}
                />
              ) : null}
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
