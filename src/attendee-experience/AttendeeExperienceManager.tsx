"use client";

import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { usePlaybackRuntime } from "@/playback/hooks/use-playback-runtime";
import { ChatManager } from "@/chat/ChatManager";
import { OfferClientManager } from "@/offer-client/OfferClientManager";
import { AttendeeExperienceLayout } from "./layout/AttendeeExperienceLayout";
import { AttendanceHeartbeat } from "./AttendanceHeartbeat";

type AttendeeExperienceManagerProps = {
  playbackToken: AttendeeBroadcastServiceToken;
  title?: string;
};

function AttendeeExperienceShell({
  playbackToken,
  title,
}: AttendeeExperienceManagerProps) {
  const { isChatEnabled } = usePlaybackRuntime();

  return (
    <>
      <AttendanceHeartbeat />
      <ChatManager
        sessionId={playbackToken.session.id}
        registrantId={playbackToken.registrant_id}
        region={playbackToken.stream?.region ?? playbackToken.region}
        currentUserRole={playbackToken.role}
        enabled={isChatEnabled}
      >
        <AttendeeExperienceLayout playbackToken={playbackToken} title={title} />
      </ChatManager>
    </>
  );
}

export function AttendeeExperienceManager({
  playbackToken,
  title,
}: AttendeeExperienceManagerProps) {
  return (
    <OfferClientManager
      sessionId={playbackToken.session.id}
      user={{
        user_id: playbackToken.user_id,
        registrant_id: playbackToken.registrant_id,
        attendance_id: playbackToken.attendance_id,
        email: playbackToken.email,
        first_name: playbackToken.first_name,
        last_name: playbackToken.last_name,
      }}
    >
      <AttendeeExperienceShell playbackToken={playbackToken} title={title} />
    </OfferClientManager>
  );
}
