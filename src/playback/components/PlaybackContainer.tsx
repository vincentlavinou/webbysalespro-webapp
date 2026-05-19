"use client";

import { useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import WaitingRoomShimmer from "@/webinar/components/WaitingRoomShimmer";
import { useWebinar } from "@/webinar/hooks";
import { useSessionPresence } from "@/broadcast/hooks";
import { notifyErrorUiMessage } from "@/lib/notify";
import { useRouter } from "next/navigation";
import { useAttendeeSession } from "@/attendee-session/hooks/use-attendee-session";
import { onPlaybackPlaying } from "@/emitter/playback";
import { createAttendeeBroadcastServiceTokenAction } from "../service/action";
import { PlaybackClient } from "../client/PlaybackClient";
import { useWakeLock } from "@/hooks/use-wake-lock";

const AUTH_ERROR_CODES = new Set(["ATD-001", "unauthorized"]);

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeStream(
  stream: AttendeeBroadcastServiceToken["stream"],
  fallbackRegion: string,
): AttendeeBroadcastServiceToken["stream"] {
  if (!stream || typeof stream !== "object") {
    return undefined;
  }

  const region = hasNonEmptyString(stream.region) ? stream.region : fallbackRegion;

  if (
    stream.kind === "channel" &&
    hasNonEmptyString(stream.config?.playback_url)
  ) {
    return {
      kind: "channel",
      region,
      config: {
        channel_arn: stream.config.channel_arn,
        playback_url: stream.config.playback_url,
      },
    };
  }

  if (
    stream.kind === "realtime" &&
    hasNonEmptyString(stream.config?.stage_arn) &&
    hasNonEmptyString(stream.config?.participant_token)
  ) {
    return {
      kind: "realtime",
      region,
      config: {
        stage_arn: stream.config.stage_arn,
        participant_token: stream.config.participant_token,
      },
    };
  }

  return undefined;
}

function normalizePlaybackToken(
  token: AttendeeBroadcastServiceToken | null | undefined,
  fallbackTitle: string,
): AttendeeBroadcastServiceToken | null {
  if (!token) {
    return null;
  }

  if (
    !hasNonEmptyString(token.user_id) ||
    !hasNonEmptyString(token.registrant_id) ||
    !hasNonEmptyString(token.attendance_id) ||
    !token.session ||
    !hasNonEmptyString(token.session.id) ||
    !token.webinar
  ) {
    return null;
  }

  const region = hasNonEmptyString(token.region)
    ? token.region
    : hasNonEmptyString(token.stream?.region)
      ? token.stream.region
      : "us-east-1";

  return {
    ...token,
    region,
    stream: normalizeStream(token.stream, region),
    webinar: {
      ...token.webinar,
      title: hasNonEmptyString(token.webinar.title)
        ? token.webinar.title
        : fallbackTitle,
      media: Array.isArray(token.webinar.media) ? token.webinar.media : [],
      presenters: Array.isArray(token.webinar.presenters)
        ? token.webinar.presenters
        : [],
      offers: Array.isArray(token.webinar.offers) ? token.webinar.offers : [],
    },
  };
}

type Props = {
  sessionId: string;
  webinarTitle: string;
  clientRedirectTo?: string;
};

export function PlaybackContainer({
  sessionId,
  webinarTitle,
  clientRedirectTo,
}: Props) {
  useWakeLock()

  const [playbackToken, setPlaybackToken] = useState<AttendeeBroadcastServiceToken | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { recordEvent } = useWebinar();
  const hasFiredLiveWatchingRef = useRef(false);
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
    return onPlaybackPlaying(() => {
      if (hasFiredLiveWatchingRef.current) return;
      hasFiredLiveWatchingRef.current = true;
      void recordEvent("live_watching");
    });
  }, [recordEvent]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setBootstrapError(null);

      const fetchToken = () => createAttendeeBroadcastServiceTokenAction({ sessionId });
      let result = await fetchToken();

      if (result?.serverError && AUTH_ERROR_CODES.has(result.serverError.code)) {
        await refreshSessionRef.current();
        result = await fetchToken();
      }

      if (cancelled) return;

      if (!result?.data) {
        const detail = result?.serverError?.detail ?? "Unable to join live stream.";
        const code = result?.serverError?.code ?? "unknown";
        console.error(`[playback] token fetch failed (${code}): ${detail}`);
        setPlaybackToken(null);
        setBootstrapError("Unable to join live stream.");
        notifyErrorUiMessage(detail);
        return;
      }

      const normalizedToken = normalizePlaybackToken(result.data, webinarTitle);

      if (!normalizedToken) {
        const raw = result.data as Partial<AttendeeBroadcastServiceToken> | null | undefined;
        Sentry.captureMessage("malformed attendee token payload", {
          level: "error",
          tags: { area: "playback-bootstrap" },
          extra: {
            sessionId,
            tokenKeys: raw && typeof raw === "object" ? Object.keys(raw) : [],
            hasStream: Boolean(raw?.stream),
            hasWebinar: Boolean(raw?.webinar),
            streamKind: raw?.stream?.kind,
          },
        });
        setPlaybackToken(null);
        setBootstrapError("Unable to join live stream.");
        notifyErrorUiMessage("We received incomplete webinar data. Please try again.");
        return;
      }

      setPlaybackToken(normalizedToken);
      markRoom("live_joined");
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [sessionId, retryCount, markRoom, webinarTitle]);

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

  if (!playbackToken) {
    return <WaitingRoomShimmer title="Connecting to live session" />;
  }

  if (playbackToken.role === "attendee" && playbackToken.stream) {
    return (
      <PlaybackClient
        sessionId={sessionId}
        playbackToken={playbackToken}
        title={webinarTitle}
      />
    );
  }

  return <WaitingRoomShimmer title="Stream is starting" />;
}
