"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { WebinarContext } from "../context/WebinarContext";
import {
    SeriesSession,
    Webinar,
    webinarApiUrl,
} from "../service";
import { useRouter } from "next/navigation";
import { createBroadcastServiceToken, recordEvent } from "@/broadcast/service";
import { BroadcastServiceToken } from "@/broadcast/service/type";
import { onPlaybackEnded } from "@/emitter/playback";
import { WebinarSessionStatus } from "../service/enum";
import { getRealtimeConfig } from "@/realtime/service/action";
import { SessionChannelBridge } from "@/realtime/components/SessionChannelBridge";
import { realtimeAuthUrl } from "@lavinou/webbysalespro/realtime";
import { RealtimePusherProvider } from "@lavinou/webbysalespro/realtime/react";
import type { RealtimeCredentials } from "@lavinou/webbysalespro/realtime/pusher";
import { getSessionAction } from "../service/action";
import { useAction } from "next-safe-action/hooks";
import { notifyErrorUiMessage } from "@/lib/notify";
import { captureApiErrorResponse } from "@/lib/error";
import { useAttendeeSession } from "@/attendee-session/hooks/use-attendee-session";
import { useAudienceEvent } from "@/audience-events/hooks/use-audience-event";
import { RealtimeEventsProvider } from "@lavinou/webbysalespro/realtime/react";
import { audienceEventSources } from "@/audience-events/service/sources";
import { webinarSessionUpdateAudienceEventSchema } from "../service/schema";

// The SSE heartbeat window that used to live here is gone with the transport.
// Its equivalent — pusher-js's activity and pong timeouts, tuned well below the
// library's ~120s default so a silently dropped socket reconnects before an
// attendee misses the live transition — is set by the shared Pusher client.
const PRESENCE_RELEVANT_EVENT_CODES = new Set([
    "live_joined",
    "reentered",
    "chat_message",
    "offer_clicked",
    "checkout_started",
    "heartbeat",
]);

interface Props {
    sessionId: string;
    children: React.ReactNode;
    disableSse?: boolean;
}

export const WebinarProvider = ({ children, sessionId, disableSse = false }: Props) => {
    const [session, setSession] = useState<SeriesSession | undefined>(undefined);
    const [broadcastServiceToken, setBroadcastServiceToken] =
        useState<BroadcastServiceToken | undefined>(undefined);
    const [webinar, setWebinar] = useState<Webinar | undefined>(undefined);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const { attendanceId, joinSessionToken: attendeeToken, refresh: refreshJoinToken } = useAttendeeSession();
    const router = useRouter();

    const mountedRef = useRef<boolean>(false);
    const lastPresenceRelevantEventAtRef = useRef<number | null>(null);

    const markPresenceRelevantEvent = useCallback((name: string) => {
        if (!PRESENCE_RELEVANT_EVENT_CODES.has(name)) return;
        lastPresenceRelevantEventAtRef.current = Date.now();
    }, []);

    // ---- Bootstrap service token + initial data ----
    useEffect(() => {
        mountedRef.current = true;

        (async () => {
            try {
                await getSession({ id: sessionId })
            } catch (e) {
                console.error("[WebinarProvider] Failed get session service token", e);
            }

            try {
                const svc = await createBroadcastServiceToken(sessionId);
                setSession(svc.session);
                setBroadcastServiceToken(svc);
                setWebinar(svc.webinar);
            } catch (e) {
                console.error("[WebinarProvider] Failed to create service token", e);
                notifyErrorUiMessage("Unable to connect to the webinar stream.");
            }
        })();

        return () => {
            mountedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    // ---- Public event recorder ----
    const recordSessionEvent = useCallback(
        async (name: string, payload: Record<string, unknown> | undefined) => {
            markPresenceRelevantEvent(name);
            try {
                await recordEvent(name, attendanceId, payload);
            } catch (e) {
                console.error("[WebinarProvider] recordEvent failed", e);
            }
        },
        [attendanceId, markPresenceRelevantEvent]
    );

    const recordEventBeacon = useCallback(async (name: string, payload: Record<string, unknown> | undefined = undefined) => {
        markPresenceRelevantEvent(name);
        if (!attendanceId || !attendeeToken) {
            return;
        }

        const fire = () =>
            fetch(`${webinarApiUrl}/v2/attendances/${attendanceId}/events/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${attendeeToken}`,
                },
                body: JSON.stringify({
                    event_code: name,
                    source: 'client',
                    occurred_at: new Date().toISOString(),
                    payload: payload ?? {},
                }),
                keepalive: true,
            });

        try {
            const res = await fire();
            if (!res.ok) {
                await captureApiErrorResponse(res, { operation: "record-session-event" });
            }
            if (res.status >= 500) {
                await new Promise((r) => setTimeout(r, 500));
                const retryResponse = await fire();
                if (!retryResponse.ok) {
                    await captureApiErrorResponse(retryResponse, { operation: "record-session-event-retry" });
                }
            }
        } catch (e) {
            console.warn("[WebinarProvider] recordEventBeacon failed", e);
        }
    }, [attendanceId, attendeeToken, markPresenceRelevantEvent])

    const getLastPresenceRelevantEventAt = useCallback(() => {
        return lastPresenceRelevantEventAtRef.current;
    }, []);

    const regenerateBroadcastToken = useCallback(
        async () => {
            try {
                const svc = await createBroadcastServiceToken(sessionId);
                setSession(svc.session);
                setBroadcastServiceToken(svc);
                setWebinar(svc.webinar);
            } catch (e) {
                console.error("[WebinarProvider] Failed to create service token", e);
                notifyErrorUiMessage("Unable to refresh your webinar connection.");
            }
        },
        [sessionId]
    );

    const { execute: getSession } = useAction(getSessionAction, {
        onSuccess: async ({ data }) => {
            handleUpdateSession(data);

            // A hidden waiting-room tab can miss the live-status SSE event that
            // normally refreshes the stream token. When a reconnect/refetch finds
            // the session already live, regenerate the token here as well so the
            // room can redirect to /live immediately.
            if (data?.status === WebinarSessionStatus.IN_PROGRESS) {
                await regenerateBroadcastToken();
            }
        },
        onError: ({ error: { serverError } }) => {
            notifyErrorUiMessage(serverError, "Unable to refresh webinar session details.");
        }
    })

    const handleUpdateSession = useCallback((session: SeriesSession) => {
        setSession(session);

        if (
            session.status === WebinarSessionStatus.COMPLETED ||
            session.status === WebinarSessionStatus.CANCELED
        ) {
            setIsRedirecting(true);
            router.replace(`/${sessionId}/completed`);
        }
    }, [setSession, router, setIsRedirecting, sessionId])

    // ---- Navigate to completed when IVS player stream ends ----
    useEffect(() => {
        return onPlaybackEnded(() => {
            setIsRedirecting(true);
            router.replace(`/${sessionId}/completed`);
        });
    }, [sessionId, router]);

    // ---- Realtime event handlers (webinar-specific) ----
    const handleEventUpdateSession = useCallback(
        (data: unknown) => {
            const status = (data as { status?: WebinarSessionStatus } | null)?.status;
            if (!status) {
                console.error("[Realtime] missing status on session:update", data);
                return;
            }
            handleUpdateSession({ ...(session || {}), status } as SeriesSession);
            if (status === WebinarSessionStatus.IN_PROGRESS) regenerateBroadcastToken();
        },
        [session, handleUpdateSession, regenerateBroadcastToken]
    );

    useAudienceEvent({
        eventType: "webinar:session:update",
        schema: webinarSessionUpdateAudienceEventSchema,
        sessionId,
        getStateScope: (evt) => evt.payload.session_id,
        compareEventKeys: (incoming, latestApplied) => incoming.localeCompare(latestApplied),
        onEvent: (event) => {
            handleUpdateSession({
                ...(session || {}),
                id: event.payload.session_id,
                status: event.payload.status,
            } as SeriesSession);

            if (event.payload.status === WebinarSessionStatus.IN_PROGRESS) {
                void regenerateBroadcastToken();
            }
        },
    });

    // The SSE fallback is gone: the backend removed it, and `client_config()`
    // now hardcodes `use_pusher: True`. Falling back to it on a config failure
    // selected a transport that could not answer, which for an attendee in the
    // waiting room meant never learning the session had gone live.

    const realtimeEnabled =
        !disableSse &&
        !!attendeeToken &&
        !!broadcastServiceToken &&
        mountedRef.current &&
        session?.status !== WebinarSessionStatus.COMPLETED;

    const realtimeSessionId = broadcastServiceToken?.session?.id || sessionId;

    // Read through refs so the credentials object stays stable: rebuilding it
    // would rebuild the socket.
    const attendeeTokenRef = useRef(attendeeToken);
    attendeeTokenRef.current = attendeeToken;
    const refreshJoinTokenRef = useRef(refreshJoinToken);
    refreshJoinTokenRef.current = refreshJoinToken;

    const realtimeCredentials = useMemo<RealtimeCredentials>(
        () => ({
            headers: (): Record<string, string> =>
                attendeeTokenRef.current
                    ? { Authorization: `Bearer ${attendeeTokenRef.current}` }
                    : {},
            recover: async () => {
                // `refresh()` resolves with the new token, so the retry can
                // authorize with it immediately instead of waiting a render for
                // the context update to land.
                const refreshed = await refreshJoinTokenRef.current();
                if (!refreshed) return "fail";
                attendeeTokenRef.current = refreshed;
                return "retry";
            },
        }),
        []
    );

    const fetchRealtimeConfig = useCallback(
        () => getRealtimeConfig(realtimeSessionId),
        [realtimeSessionId]
    );

    return (
        <WebinarContext.Provider
            value={{
                session,
                setSession,
                sessionId,
                broadcastServiceToken,
                isRedirecting,
                webinar,
                recordEvent: recordSessionEvent,
                recordEventBeacon,
                getLastPresenceRelevantEventAt,
                regenerateBroadcastToken,
            }}
        >
            <RealtimePusherProvider
                enabled={realtimeEnabled}
                fetchConfig={fetchRealtimeConfig}
                authUrl={realtimeAuthUrl(webinarApiUrl)}
                credentials={realtimeCredentials}
                hasCredential={!!attendeeToken}
            >
                <SessionChannelBridge
                    sessionId={realtimeSessionId}
                    onSessionUpdate={handleEventUpdateSession}
                    onSubscribed={() => {
                        void getSession({ id: sessionId });
                    }}
                />
                {/*
                  * Every audience-event consumer renders beneath a
                  * WebinarProvider, so mounting the fan-in here covers all of
                  * them without each route layout having to remember to. One
                  * listener set also means an event delivered over both timed
                  * metadata and chat is de-duplicated once rather than per
                  * subscribing hook.
                  */}
                <RealtimeEventsProvider sources={audienceEventSources}>
                    {children}
                </RealtimeEventsProvider>
            </RealtimePusherProvider>
        </WebinarContext.Provider>
    );
};
