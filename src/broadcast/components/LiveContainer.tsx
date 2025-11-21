"use client";

import { useEffect, useState } from "react";
import { AttendeePlayerClient } from "@/broadcast/AttendeePlayerClient";
import { BroadcastParticipantClient } from "@/broadcast/BroadcastParticipantClient";
import { AttendeeBroadcastServiceToken, BroadcastServiceToken } from "@/broadcast/service/type";
import { createBroadcastServiceToken } from "../service";
import WaitingRoomShimmer from "@/webinar/components/WaitingRoomShimmer";

type Props = {
  sessionId: string;
  accessToken: string;
  webinarTitle: string;
};

export function LiveContainer({ sessionId, accessToken, webinarTitle }: Props) {
  const [broadcastToken, setBroadcastToken] = useState<BroadcastServiceToken | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await createBroadcastServiceToken(sessionId, accessToken);
      if (!cancelled) setBroadcastToken(token);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, accessToken]);

  if (!broadcastToken) {
    // optional loading UI
    return <div>Connecting to live session...</div>;
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
      />
    );
  }

  // fallback if role is host or no stream
  return <WaitingRoomShimmer />
}
