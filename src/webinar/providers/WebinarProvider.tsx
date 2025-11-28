"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { WebinarContext } from "../context/WebinarContext";
import {
    SeriesSession,
    Webinar,
    webinarApiUrl,
} from "../service";
import { useRouter, useSearchParams } from "next/navigation";
import { createBroadcastServiceToken, recordEvent } from "@/broadcast/service";
import { BroadcastServiceToken } from "@/broadcast/service/type";
import { WebinarSessionStatus } from "../service/enum";
import { useEventSource } from "@/sse";
import { getSessionAction } from "../service/action";
import { useAction } from "next-safe-action/hooks";

// ---- Tuning knobs (can be shared with hook defaults or overridden) ----
const HEARTBEAT_TIMEOUT_MS = 45_000;

interface Props {
    sessionId: string;
    children: React.ReactNode;
}

export const WebinarProvider = ({ children, sessionId }: Props) => {
    const [session, setSession] = useState<SeriesSession | undefined>(undefined);
    const [broadcastServiceToken, setBroadcastServiceToken] =
        useState<BroadcastServiceToken | undefined>(undefined);
    const [token, setToken] = useState<string | undefined>(undefined);
    const [webinar, setWebinar] = useState<Webinar | undefined>(undefined);
    const [isRedirecting, setIsRedirecting] = useState(false);

    const searchParams = useSearchParams();
    const router = useRouter();
    const {execute: getSession} = useAction(getSessionAction, {
        onSuccess: async ({data, input}) => {
            handleUpdateSession(data, input.token)
        }
    })

    const mountedRef = useRef<boolean>(false);

    // ---- Bootstrap service token + initial data ----
    useEffect(() => {
        mountedRef.current = true;
        const attendeeToken = searchParams.get("token") || undefined;

        (async () => {
            if (!attendeeToken) return;
            try {
                await getSession({id: sessionId, token: attendeeToken})
                
            } catch(e) {
                console.error("[WebinarProvider] Failed get session service token", e);
            }

            try {
                const svc = await createBroadcastServiceToken(sessionId, attendeeToken);
                setSession(svc.session);
                setBroadcastServiceToken(svc);
                setWebinar(svc.webinar);
                setToken(attendeeToken);
            } catch (e) {
                console.error("[WebinarProvider] Failed to create service token", e);
            }
        })();

        return () => {
            mountedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, searchParams]);

    // ---- Public event recorder ----
    const recordSessionEvent = useCallback(
        async (name: string, payload: Record<string, unknown> | undefined) => {
            if (!token) return;
            try {
                await recordEvent(name, sessionId, token, payload);
            } catch (e) {
                console.error("[WebinarProvider] recordEvent failed", e);
            }
        },
        [sessionId, token]
    );

    const regenerateBroadcastToken = useCallback(
        async (newToken: string) => {
            try {
                const svc = await createBroadcastServiceToken(sessionId, newToken);
                setSession(svc.session);
                setBroadcastServiceToken(svc);
                setWebinar(svc.webinar);
                setToken(newToken);
            } catch (e) {
                console.error("[WebinarProvider] Failed to create service token", e);
            }
        },
        [sessionId]
    );

    const handleUpdateSession = useCallback((session: SeriesSession, token: string) => {

        setSession(session);

        switch (session.status) {
            case WebinarSessionStatus.IN_PROGRESS:
                setIsRedirecting(true);
                router.replace(`/${sessionId}/live?token=${token}`);
                break;
            case WebinarSessionStatus.COMPLETED:
                setIsRedirecting(true);
                router.replace(`/${sessionId}/completed?token=${token}`);
                // After completion we don't care about SSE anymore;
                // SSE hook will be disabled via `enabled` flag below.
                break;
        }

    }, [setSession, router, setIsRedirecting, sessionId])

    // ---- SSE event handlers (webinar-specific) ----
    const handleEventUpdateSession = useCallback(
        (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as { status: WebinarSessionStatus };
                if(token) handleUpdateSession({ ...(session || {}), status: data.status } as SeriesSession, token)
                if(token && data.status === WebinarSessionStatus.IN_PROGRESS) regenerateBroadcastToken(token)
            } catch (e) {
                console.error("[SSE] Parse error (session:update)", e, event.data);
            }
        },
        [token, session, handleUpdateSession]
    );

    // ---- Build SSE URL (generic for hook) ----
    const buildSseUrl = useCallback(
        (lastEventId: string | null) => {
            if (!broadcastServiceToken) return "";
            const base = `${webinarApiUrl}/v1/sessions/events/`;
            const params = new URLSearchParams();
            params.set(
                "channels",
                `webinar-session-${broadcastServiceToken.session?.id || sessionId}`
            );
            if (token) params.set("token", token);
            if (lastEventId) params.set("lastEventId", lastEventId);
            return `${base}?${params.toString()}`;
        },
        [broadcastServiceToken, sessionId, token]
    );

    const sseEnabled =
        !!token &&
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
        // We only use default "message" as a heartbeat; no payload needs parsing here.
        onMessage: () => {
            // no-op, hook already counts this as activity
        },
        onOpen: async () => {
            if (token) {
                await getSession({id: sessionId, token})
            }
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
                token,
                isRedirecting,
                webinar,
                recordEvent: recordSessionEvent,
                regenerateBroadcastToken,
            }}
        >
            {children}
        </WebinarContext.Provider>
    );
};
