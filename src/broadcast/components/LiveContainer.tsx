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
import { notifyErrorUiMessage } from "@/lib/notify";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
  webinarTitle: string;
  offers: OfferSessionDto[];
  clientRedirectTo?: string;
};

export function LiveContainer({ sessionId, webinarTitle, offers, clientRedirectTo }: Props) {
  const [broadcastToken, setBroadcastToken] = useState<BroadcastServiceToken | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [playerRefreshKey, setPlayerRefreshKey] = useState(0);
  const [isRefreshingStream, setIsRefreshingStream] = useState(false);
  useWebinar();
  const { markRoom } = useSessionPresence();
  const router = useRouter();

  useEffect(() => {
    if (clientRedirectTo) {
      router.replace(clientRedirectTo);
    }
  }, [clientRedirectTo, router]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setBootstrapError(null);
        const token = await createBroadcastServiceToken(sessionId);
        if (!cancelled) {
          setBroadcastToken(token);
          markRoom("live_joined");
        }
      } catch {
        if (!cancelled) {
          setBroadcastToken(null);
          setBootstrapError("Unable to join live stream.");
          notifyErrorUiMessage("Unable to join live stream.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, retryCount, markRoom]);

  const refreshStream = async () => {
    if (isRefreshingStream) return;

    setIsRefreshingStream(true);

    try {
      const token = await createBroadcastServiceToken(sessionId);
      setBroadcastToken(token);
    } catch {
      notifyErrorUiMessage("Unable to refresh the stream token. Retrying the player.");
    } finally {
      setPlayerRefreshKey((count) => count + 1);
      setIsRefreshingStream(false);
    }
  };

  if (clientRedirectTo) {
    return <WaitingRoomShimmer title="Redirecting…" />;
  }

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
    return <WaitingRoomShimmer title="Connecting to live session" />
  }

  if (broadcastToken.role === "presenter" && broadcastToken.stream) {
    return (
      <BroadcastParticipantClient
        sessionId={sessionId}
        broadcastToken={broadcastToken}
        title={webinarTitle}
        isViewer
      />
    );
  }

  if (broadcastToken.role === "attendee" && broadcastToken.stream) {
    return (
      <VideoInjectionPlayerProvider sessionId={sessionId}>
        <OfferSessionClientProvider
          sessionId={sessionId}
          initialOffers={offers}
          email={broadcastToken.email || ''}
        >
          <AttendeePlayerClient
            key={`${sessionId}-${playerRefreshKey}`}
            sessionId={sessionId}
            broadcastToken={broadcastToken as AttendeeBroadcastServiceToken}
            title={webinarTitle}
            onRefreshStream={refreshStream}
            isRefreshingStream={isRefreshingStream}
          />
        </OfferSessionClientProvider>
      </VideoInjectionPlayerProvider>
    );
  }

  // fallback if role is host or no stream
  return <WaitingRoomShimmer title="Stream is starting" />
}
