"use client";

import { useEffect, useState } from "react";
import { AttendeePlayerClient } from "@/broadcast/AttendeePlayerClient";
import { BroadcastParticipantClient } from "@/broadcast/BroadcastParticipantClient";
import { AttendeeBroadcastServiceToken, BroadcastServiceToken } from "@/broadcast/service/type";
import { createBroadcastServiceToken } from "../service";
import WaitingRoomShimmer from "@/webinar/components/WaitingRoomShimmer";
import { useWebinar } from "@/webinar/hooks";
import { useSessionPresence } from "@/broadcast/hooks";
import { OfferSessionClientProvider } from "@/offer-client/providers/OfferSessionClientProvider";
import { OfferSessionDto } from "@/offer-client/service/type";
import { VideoInjectionPlayerProvider } from "@/video-injection";

type Props = {
  sessionId: string;
  accessToken: string;
  webinarTitle: string;
  offers: OfferSessionDto[]
};

export function LiveContainer({ sessionId, accessToken, webinarTitle, offers }: Props) {
  const [broadcastToken, setBroadcastToken] = useState<BroadcastServiceToken | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { recordEvent } = useWebinar()
  const { markRoom } = useSessionPresence(accessToken);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setBootstrapError(null);
        const token = await createBroadcastServiceToken(sessionId, accessToken);
        if (!cancelled) {
          setBroadcastToken(token);
          markRoom("joined");
        }
      } catch {
        if (!cancelled) {
          setBroadcastToken(null);
          setBootstrapError("Unable to join live stream.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, accessToken, retryCount, markRoom]);

  if (bootstrapError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-sm text-gray-700 dark:text-gray-200">{bootstrapError}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
      <VideoInjectionPlayerProvider sessionId={sessionId} token={accessToken}>
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
      </VideoInjectionPlayerProvider>
    );
  }

  // fallback if role is host or no stream
  return <WaitingRoomShimmer title="Stream is starting" />
}
