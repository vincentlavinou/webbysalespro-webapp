"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { useRealtimeChannel } from "@/realtime";
import { getSessionAction } from "../service/action";
import { useAction } from "next-safe-action/hooks";
import { notifyErrorUiMessage } from "@/lib/notify";
import { useAttendeeSession } from "@/attendee-session/hooks/use-attendee-session";
import { useAudienceEvent } from "@/audience-events/hooks/use-audience-event";
import { webinarSessionUpdateAudienceEventSchema } from "../service/schema";

// ---- Tuning knobs (can be shared with hook defaults or overridden) ----
const HEARTBEAT_TIMEOUT_MS = 45_000;
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
            if (res.status >= 500) {
                await new Promise((r) => setTimeout(r, 500));
                await fire();
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

    // ---- Build SSE fallback URL ----
    // EventSource cannot send custom headers, so auth is passed via ?token=.
    const buildSseUrl = useCallback(
        (lastEventId: string | null) => {
            if (!broadcastServiceToken) return "";
            const base = `${webinarApiUrl}/v1/sessions/events/`;
            const params = new URLSearchParams();
            params.set(
                "channels",
                `webinar-session-${broadcastServiceToken.session?.id || sessionId}`
            );
            if (attendeeToken) params.set("token", attendeeToken);
            if (lastEventId) params.set("lastEventId", lastEventId);
            return `${base}?${params.toString()}`;
        },
        [broadcastServiceToken, sessionId, attendeeToken]
    );

    const realtimeEnabled =
        !disableSse &&
        !!attendeeToken &&
        !!broadcastServiceToken &&
        mountedRef.current &&
        session?.status !== WebinarSessionStatus.COMPLETED;

    useRealtimeChannel({
        enabled: realtimeEnabled,
        sessionId: broadcastServiceToken?.session?.id || sessionId,
        attendeeToken,
        buildSseUrl,
        eventHandlers: {
            "webinar:session:update": handleEventUpdateSession,
        },
        onOpen: async () => {
            await getSession({ id: sessionId })
        },
        onError: (err) => {
            console.error("[Realtime] Error in WebinarProvider", err);
        },
        onTokenExpired: refreshJoinToken,
        heartbeatTimeoutMs: HEARTBEAT_TIMEOUT_MS,
    });

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
            {children}
        </WebinarContext.Provider>
    );
};
