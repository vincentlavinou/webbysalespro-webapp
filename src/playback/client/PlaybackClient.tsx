'use client';

import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { WebinarMediaFieldType } from "@/media";
import type { WebinarMedia } from "@/media";
import { PlaybackConfigurationProvider } from "../provider/PlaybackConfigurationProvider";
import { PlaybackRuntimeProvider } from "../provider/PlaybackRuntimeProvider";
import { PlaybackUserProvider } from "../provider/PlaybackUserProvider";
import { PersistentChannelPlaybackProvider } from "../persistent/PersistentChannelPlaybackProvider";
import { PersistentStagePlaybackProvider } from "../persistent/PersistentStagePlaybackProvider";
import { AttendeeExperienceManager } from "@/attendee-experience/AttendeeExperienceManager";

type PlaybackClientProps = {
  sessionId: string;
  getRequestHeaders?: () => Promise<RequestHeaders | undefined>;
  playbackToken: AttendeeBroadcastServiceToken;
  title?: string;
};

export function PlaybackClient(props: PlaybackClientProps) {
  const channelStream =
    props.playbackToken.stream?.kind === "channel"
      ? props.playbackToken.stream
      : undefined;

  const realtimeStream =
    props.playbackToken.stream?.kind === "realtime"
      ? props.playbackToken.stream
      : undefined;

  const artwork: MediaImage[] = props.playbackToken.webinar.media
    .filter(
      (media: WebinarMedia) =>
        media.file_type === "image" &&
        media.field_type === WebinarMediaFieldType.THUMBNAIL,
    )
    .map((media: WebinarMedia) => ({ src: media.file_url }));

  const inner = (
    <PlaybackConfigurationProvider
      sessionId={props.sessionId}
      getRequestHeaders={props.getRequestHeaders}
      seriesId={props.playbackToken.series}
    >
      <PlaybackUserProvider
        user={{
          user_id: props.playbackToken.user_id,
          registrant_id: props.playbackToken.registrant_id,
          attendance_id: props.playbackToken.attendance_id,
          email: props.playbackToken.email,
          first_name: props.playbackToken.first_name,
          last_name: props.playbackToken.last_name,
        }}
      >
        <PlaybackRuntimeProvider>
          <AttendeeExperienceManager
            playbackToken={props.playbackToken}
            title={props.title}
          />
        </PlaybackRuntimeProvider>
      </PlaybackUserProvider>
    </PlaybackConfigurationProvider>
  );

  if (channelStream) {
    return (
      <PersistentChannelPlaybackProvider
        src={channelStream.config.playback_url}
        title={props.playbackToken.webinar.title}
        artwork={artwork}
      >
        {inner}
      </PersistentChannelPlaybackProvider>
    );
  }

  if (realtimeStream) {
    return (
      <PersistentStagePlaybackProvider
        stream={realtimeStream}
        title={props.playbackToken.webinar.title}
        artwork={artwork}
      >
        {inner}
      </PersistentStagePlaybackProvider>
    );
  }

  return inner;
}
