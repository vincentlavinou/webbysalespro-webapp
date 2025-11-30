"use client";

import { useCallback, useEffect, useState } from "react";
import { AttendeePlayerClient } from "@/broadcast/AttendeePlayerClient";
import { BroadcastParticipantClient } from "@/broadcast/BroadcastParticipantClient";
import { AttendeeBroadcastServiceToken, BroadcastServiceToken, PlaybackMetadataEvent } from "@/broadcast/service/type";
import { createBroadcastServiceToken } from "../service";
import WaitingRoomShimmer from "@/webinar/components/WaitingRoomShimmer";
import { PlaybackMetadataEventType } from "../service/enum";
import { useWebinar } from "@/webinar/hooks";
import { SeriesSession, SessionOfferVisibilityUpdate } from "@/webinar/service";

type Props = {
  sessionId: string;
  accessToken: string;
  webinarTitle: string;
};

export function LiveContainer({ sessionId, accessToken, webinarTitle }: Props) {
  const [broadcastToken, setBroadcastToken] = useState<BroadcastServiceToken | null>(null);
  const { setSession, session, recordEvent } = useWebinar()

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await createBroadcastServiceToken(sessionId, accessToken);
      if (!cancelled) {
        setBroadcastToken(token);
        recordEvent("joined")
      }
    }

    load();

    return () => {
      cancelled = true;
      recordEvent("left")
    };
  }, [sessionId, accessToken]);

  const onPlaybackMetadataText = useCallback(async (text: string) => {
    try {
      const event = JSON.parse(text) as PlaybackMetadataEvent;
      switch (event.type) {
        case PlaybackMetadataEventType.OFFER:
          const payload = event.payload as SessionOfferVisibilityUpdate
          setSession({
            ...(session || {}),
            offer_visible: payload.visible,
            offer_shown_at: payload.shown_at,
          } as SeriesSession)

          break;
        case PlaybackMetadataEventType.SESSION:
          // handle session metadata
          break;
      }
      console.log(event);
    } catch (err) {
      console.log(err);
    }
  },[session, setSession])

  if (!broadcastToken) {
    // optional loading UI
    return <WaitingRoomShimmer title="Connecting to live session" />
  }

  if (broadcastToken.role === "presenter" && broadcastToken.stream) {
    return (
      <BroadcastParticipantClient
        sessionId={sessionId}
        accessToken={accessToken}
        broadcastToken={broadcastToken}
        title={webinarTitle}
        isViewer
      />
    );
  }

  if (broadcastToken.role === "attendee" && broadcastToken.stream) {
    return (
      <AttendeePlayerClient
        sessionId={sessionId}
        accessToken={accessToken}
        broadcastToken={broadcastToken as AttendeeBroadcastServiceToken}
        title={webinarTitle}
        onMetadataText={onPlaybackMetadataText}
      />
    );
  }

  // fallback if role is host or no stream
  return <WaitingRoomShimmer title="Stream is starting" />
}
