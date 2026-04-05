'use client';

import { RequestHeaders } from "next/dist/client/components/router-reducer/fetch-server-response";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { PlaybackConfigurationProvider } from "../provider/PlaybackConfigurationProvider";
import { PlaybackRuntimeProvider } from "../provider/PlaybackRuntimeProvider";
import { PlaybackUserProvider } from "../provider/PlaybackUserProvider";
import { AttendeeExperienceManager } from "@/attendee-experience/AttendeeExperienceManager";

type PlaybackClientProps = {
  sessionId: string;
  getRequestHeaders?: () => Promise<RequestHeaders | undefined>;
  playbackToken: AttendeeBroadcastServiceToken;
  title?: string;
};

export function PlaybackClient(props: PlaybackClientProps) {
  return (
    <PlaybackConfigurationProvider
      sessionId={props.sessionId}
      getRequestHeaders={props.getRequestHeaders}
      seriesId={props.playbackToken.series}
    >
      <PlaybackUserProvider
        user={{
          user_id: props.playbackToken.user_id,
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
}
