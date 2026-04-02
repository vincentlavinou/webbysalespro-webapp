"use client";

import { useEffect, useRef, useState } from "react";
import { AttendeePlayerClient } from "@/broadcast/AttendeePlayerClient";
import { BroadcastParticipantClient } from "@/broadcast/BroadcastParticipantClient";
import { AttendeeBroadcastServiceToken, BroadcastServiceToken } from "@/broadcast/service/type";
import { createBroadcastServiceTokenAction } from "../service/action";
import WaitingRoomShimmer from "@/webinar/components/WaitingRoomShimmer";
import { useWebinar } from "@/webinar/hooks";
import { useSessionPresence } from "@/broadcast/hooks";
import { OfferSessionClientProvider } from "@/offer-client/providers/OfferSessionClientProvider";
import { OfferSessionDto } from "@/offer-client/service/type";
import { notifyErrorUiMessage } from "@/lib/notify";
import { useRouter } from "next/navigation";
import { useAttendeeSession } from "@/attendee-session/hooks/use-attendee-session";

const AUTH_ERROR_CODES = new Set(['ATD-001', 'unauthorized']);

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
  useWebinar();
  const { markRoom } = useSessionPresence();
  const router = useRouter();
  const { refresh: refreshSession } = useAttendeeSession();
  const refreshSessionRef = useRef(refreshSession);
  refreshSessionRef.current = refreshSession;

  useEffect(() => {
    if (clientRedirectTo) {
      router.replace(clientRedirectTo);
    }
  }, [clientRedirectTo, router]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setBootstrapError(null);

      const fetchToken = () => createBroadcastServiceTokenAction({ sessionId });

      let result = await fetchToken();

      // On auth errors, refresh the join session token and retry once.
      if (result?.serverError && AUTH_ERROR_CODES.has(result.serverError.code)) {
        await refreshSessionRef.current();
        result = await fetchToken();
      }

      if (cancelled) return;

      if (!result?.data) {
        const detail = result?.serverError?.detail ?? 'Unable to join live stream.';
        const code = result?.serverError?.code ?? 'unknown';
        console.error(`[broadcast] token fetch failed (${code}): ${detail}`);
        setBroadcastToken(null);
        setBootstrapError("Unable to join live stream.");
        notifyErrorUiMessage(detail);
        return;
      }

      setBroadcastToken(result.data);
      markRoom("live_joined");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, retryCount, markRoom]);

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
      <OfferSessionClientProvider
        sessionId={sessionId}
        initialOffers={offers}
        user={{ user_id: broadcastToken.user_id, email: broadcastToken.email, first_name: broadcastToken.first_name, last_name: broadcastToken.last_name }}
      >
        <AttendeePlayerClient
          sessionId={sessionId}
          broadcastToken={broadcastToken as AttendeeBroadcastServiceToken}
          title={webinarTitle}
        />
      </OfferSessionClientProvider>
    );
  }

  // fallback if role is host or no stream
  return <WaitingRoomShimmer title="Stream is starting" />
}
