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
import { OfferSessionClientProvider } from "@/offer-client/providers/OfferSessionClientProvider";
import { OfferSessionDto } from "@/offer-client/service/type";

type Props = {
  sessionId: string;
  accessToken: string;
  webinarTitle: string;
  offers: OfferSessionDto[]
};

export function LiveContainer({ sessionId, accessToken, webinarTitle, offers }: Props) {
  const [broadcastToken, setBroadcastToken] = useState<BroadcastServiceToken | null>(null);
  const { setSession, session, recordEvent } = useWebinar()

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await createBroadcastServiceToken(sessionId, accessToken);
      if (!cancelled) {
        setBroadcastToken(token);
        recordEvent("joined", accessToken)
      }
    }

    load();

    return () => {
      cancelled = true;
      recordEvent("left", accessToken)
    };
  }, [sessionId, accessToken]);

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
      <OfferSessionClientProvider
        sessionId={sessionId}
        token={accessToken}
        initialOffers={offers}
        email={broadcastToken.email || ''}
        recordEvent={recordEvent}
      >
        <AttendeePlayerClient
          sessionId={sessionId}
          accessToken={accessToken}
          broadcastToken={broadcastToken as AttendeeBroadcastServiceToken}
          title={webinarTitle}
        />
      </OfferSessionClientProvider>

    );
  }

  // fallback if role is host or no stream
  return <WaitingRoomShimmer title="Stream is starting" />
}
