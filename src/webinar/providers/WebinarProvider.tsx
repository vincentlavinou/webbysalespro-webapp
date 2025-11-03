'use client';
import { useState, useEffect, useCallback, useRef } from "react";
import { WebinarContext } from "../context/WebinarContext";
import { SeriesSession, SessionOfferVisibilityUpdate, Webinar, webinarApiUrl } from "../service";
import { useRouter, useSearchParams } from "next/navigation";
import { recordEvent } from "@/broadcast/service";
import { AttendeeBroadcastServiceToken } from "@/broadcast/service/type";
import { WebinarSessionStatus } from "../service/enum";
import { createAttendeeBroadcastServiceToken } from "@/broadcast/service/action";

// ---- Tuning knobs ----
const HEARTBEAT_TIMEOUT_MS = 45_000;       // If we see no events for this long, reconnect
const INITIAL_BACKOFF_MS = 1_000;        // Start backoff at 1s
const MAX_BACKOFF_MS = 30_000;       // Cap backoff at 30s
const JITTER_PCT = 0.25;         // +/- 25% jitter

interface Props {
    sessionId: string;
    children: React.ReactNode;
}

export const WebinarProvider = ({ children, sessionId }: Props) => {
    const [session, setSession] = useState<SeriesSession | undefined>(undefined);
    const [broadcastServiceToken, setBroadcastServiceToken] = useState<AttendeeBroadcastServiceToken | undefined>(undefined);
    const [token, setToken] = useState<string | undefined>(undefined);
    const [webinar, setWebinar] = useState<Webinar | undefined>(undefined);

    const searchParams = useSearchParams();
    const router = useRouter();

    // Refs for SSE lifecycle
    const esRef = useRef<EventSource | null>(null);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
    const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
    const backoffRef = useRef<number>(INITIAL_BACKOFF_MS);
    const lastEventIdRef = useRef<string | null>(null);
    const intentionallyClosedRef = useRef<boolean>(false);
    const mountedRef = useRef<boolean>(false);

    // ---- Helpers ----
    const clearTimers = () => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (heartbeatTimerRef.current) {
            clearTimeout(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }
    };

    const closeES = () => {
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
    };

    const scheduleHeartbeat = () => {
        if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
        heartbeatTimerRef.current = setTimeout(() => {
            // No events for too long — force reconnect
            console.warn("[SSE] Heartbeat timeout — reconnecting");
            reopenES();
        }, HEARTBEAT_TIMEOUT_MS);
    };

    const jitter = (ms: number) => {
        const delta = ms * JITTER_PCT;
        return Math.round(ms + (Math.random() * 2 - 1) * delta);
    };

    const scheduleReconnect = () => {
        if (!mountedRef.current) return;
        if (reconnectTimerRef.current) return; // already scheduled
        const delay = jitter(backoffRef.current);
        console.warn(`[SSE] Scheduling reconnect in ${delay}ms`);
        reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            reopenES();
        }, delay);
        // Exponential backoff
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF_MS);
    };

    const onAnyEventActivity = (e?: MessageEvent) => {
        // Save lastEventId if provided
        if (e?.lastEventId) lastEventIdRef.current = e.lastEventId;
        scheduleHeartbeat();
    };

    const buildSseUrl = () => {
        const base = `${webinarApiUrl}/v1/sessions/events/`;
        const params = new URLSearchParams();
        params.set("channels", `webinar-session-${broadcastServiceToken?.session?.id || sessionId}`);
        if (token) params.set("token", token);
        if (lastEventIdRef.current) params.set("lastEventId", lastEventIdRef.current); // if server supports resume
        return `${base}?${params.toString()}`;
    };

    // ---- Open SSE ----
    const openES = useCallback(() => {
        if (!token || !broadcastServiceToken) return;
        if (!mountedRef.current) return;

        // Clean slate
        clearTimers();
        closeES();

        intentionallyClosedRef.current = false;

        const url = buildSseUrl();
        const es = new EventSource(url);
        esRef.current = es;

        // When connection opens, reset backoff + watchdog
        es.addEventListener("open", () => {
            console.info("[SSE] Open");
            backoffRef.current = INITIAL_BACKOFF_MS;
            onAnyEventActivity();
        });

        // Session status updates
        es.addEventListener("webinar:session:update", (event: MessageEvent) => {
            onAnyEventActivity(event);
            try {
                const data = JSON.parse(event.data) as { status: WebinarSessionStatus };
                setSession(prev => ({ ...prev, status: data.status } as SeriesSession));

                switch (data.status) {
                    case WebinarSessionStatus.IN_PROGRESS:
                        router.replace(`/${sessionId}/live?token=${token}`);
                        break;
                    case WebinarSessionStatus.COMPLETED:
                        router.replace(`/${sessionId}/completed?token=${token}`);
                        // Let it close; no need to auto-reconnect if the session is truly done
                        intentionallyClosedRef.current = true;
                        closeES();
                        clearTimers();
                        break;
                }
            } catch (e) {
                console.error("[SSE] Parse error (session:update)", e, event.data);
            }
        });

        // Offer visibility
        es.addEventListener("webinar:offer:visibility", (event: MessageEvent) => {
            onAnyEventActivity(event);
            try {
                const data = JSON.parse(event.data) as SessionOfferVisibilityUpdate;
                setSession(prev => ({ ...prev, offer_visible: data.visible, offer_shown_at: data.shown_at } as SeriesSession));
            } catch (e) {
                console.error("[SSE] Parse error (offer:visibility)", e, event.data);
            }
        });

        // Generic message activity → reset heartbeat
        es.addEventListener("message", onAnyEventActivity);

        es.onerror = (err) => {
            console.warn("[SSE] Error", err);
            closeES();
            if (!intentionallyClosedRef.current) {
                scheduleReconnect();
            }
        };

        // Start watchdog
        scheduleHeartbeat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, broadcastServiceToken, sessionId, router]);

    const reopenES = useCallback(() => {
        if (!mountedRef.current) return;
        openES();
    }, [openES]);

    // ---- Bootstrap service token + initial data ----
    useEffect(() => {
        mountedRef.current = true;
        const attendeeToken = searchParams.get('token') || undefined;
        (async () => {
            if (!attendeeToken) return
            const svc = await createAttendeeBroadcastServiceToken(sessionId, token);
            setSession(svc.session);
            setBroadcastServiceToken(svc);
            setWebinar(svc.webinar);
            setToken(token);
        })();

        return () => {
            mountedRef.current = false;
            intentionallyClosedRef.current = true;
            clearTimers();
            closeES();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, searchParams]);

    // ---- Wire SSE when we have token + service token ----
    useEffect(() => {
        if (!token || !broadcastServiceToken) return;
        openES();
        return () => {
            intentionallyClosedRef.current = true;
            clearTimers();
            closeES();
        };
    }, [token, broadcastServiceToken]);

    // ---- Network + tab visibility awareness ----
    useEffect(() => {
        const onOnline = () => {
            console.info("[SSE] Browser online — reconnecting now");
            backoffRef.current = INITIAL_BACKOFF_MS;
            reopenES();
        };
        const onOffline = () => {
            console.warn("[SSE] Browser offline — closing connection");
            closeES();
            clearTimers();
        };
        const onVisible = () => {
            if (document.visibilityState === "visible") {
                // On return to the tab, make sure we’re connected/fresh
                console.info("[SSE] Tab visible — verifying connection");
                backoffRef.current = INITIAL_BACKOFF_MS;
                reopenES();
            }
        };

        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener("offline", onOffline);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [reopenES]);

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

    const regenerateBroadcastToken = useCallback(async (token: string) => {

        try {
            const svc = await createAttendeeBroadcastServiceToken(sessionId, token);
            setSession(svc.session);
            setBroadcastServiceToken(svc);
            setWebinar(svc.webinar);
            setToken(token);
        } catch (e) {
            console.error("[WebinarProvider] Failed to create service token", e);
        }
    }, [searchParams, setSession, setBroadcastServiceToken, setWebinar, setToken])

    return (
        <WebinarContext.Provider
            value={{
                session,
                setSession,
                sessionId,
                broadcastServiceToken,
                token,
                webinar,
                recordEvent: recordSessionEvent,
                regenerateBroadcastToken
            }}
        >
            {children}
        </WebinarContext.Provider>
    );
};
