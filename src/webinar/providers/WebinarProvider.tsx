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
import { useEventSource } from "@/sse";
import { getSessionAction } from "../service/action";
import { useAction } from "next-safe-action/hooks";
import { notifyErrorUiMessage } from "@/lib/notify";
import { useAttendeeSession } from "@/attendee-session/hooks/use-attendee-session";

// ---- Tuning knobs (can be shared with hook defaults or overridden) ----
const HEARTBEAT_TIMEOUT_MS = 45_000;

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

    const { attendanceId, joinSessionToken: attendeeToken } = useAttendeeSession();
    const router = useRouter();
    const { execute: getSession } = useAction(getSessionAction, {
        onSuccess: async ({ data }) => {
            handleUpdateSession(data)
        },
        onError: ({ error: { serverError } }) => {
            notifyErrorUiMessage(serverError, "Unable to refresh webinar session details.");
        }
    })

    const mountedRef = useRef<boolean>(false);

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
            try {
                await recordEvent(name, attendanceId, payload);
            } catch (e) {
                console.error("[WebinarProvider] recordEvent failed", e);
            }
        },
        [attendanceId]
    );

    const recordEventBeacon = useCallback(async (name: string, payload: Record<string, unknown> | undefined = undefined) => {
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
    }, [attendanceId, attendeeToken])

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

    const handleUpdateSession = useCallback((session: SeriesSession) => {
        setSession(session);

        if (session.status === WebinarSessionStatus.COMPLETED) {
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

    // ---- SSE event handlers (webinar-specific) ----
    const handleEventUpdateSession = useCallback(
        (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as { status: WebinarSessionStatus };
                handleUpdateSession({ ...(session || {}), status: data.status } as SeriesSession)
                if (data.status === WebinarSessionStatus.IN_PROGRESS) regenerateBroadcastToken()
            } catch (e) {
                console.error("[SSE] Parse error (session:update)", e, event.data);
            }
        },
        [session, handleUpdateSession, regenerateBroadcastToken]
    );

    // ---- Build SSE URL (generic for hook) ----
    // NOTE: EventSource does not support custom headers, so auth is passed as
    // ?token= query param here. The backend accepts Bearer on all v1 endpoints
    // but EventSource is the one caller that can't use the header form.
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

    const sseEnabled =
        !disableSse &&
        !!attendeeToken &&
        !!broadcastServiceToken &&
        mountedRef.current &&
        session?.status !== WebinarSessionStatus.COMPLETED;

    // ---- Use generic SSE hook ----
    const { } = useEventSource({
        enabled: sseEnabled,
        buildUrl: buildSseUrl,
        eventHandlers: {
            "webinar:session:update": handleEventUpdateSession
        },
        onMessage: () => {
            // no-op, hook already counts this as activity
        },
        onOpen: async () => {
            await getSession({ id: sessionId })
        },
        onError: (err: Event) => {
            console.error("[SSE] Error in WebinarProvider", err);
        },
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
                regenerateBroadcastToken,
            }}
        >
            {children}
        </WebinarContext.Provider>
    );
};
