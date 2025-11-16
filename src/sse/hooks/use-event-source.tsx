"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ---- Defaults (can be overridden in options) ----
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 45_000; // no events for this long → reconnect
const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const JITTER_PCT = 0.25;

type EventHandler = (event: MessageEvent) => void;

export interface UseEventSourceOptions {
  enabled: boolean; // hook will only manage SSE if enabled
  buildUrl: (lastEventId: string | null) => string;

  // Handlers
  eventHandlers?: Record<string, EventHandler>; // named event handlers
  onMessage?: EventHandler;                     // default 'message' event
  onOpen?: () => Promise<void>;
  onError?: (error: Event) => void;

  // Timing overrides
  heartbeatTimeoutMs?: number;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

/**
 * Generic SSE hook with:
 * - Exponential backoff + jitter
 * - Heartbeat watchdog
 * - Online/offline + tab visibility awareness
 * - Automatic reconnect when tab becomes visible again
 * - Optional resume via lastEventId
 */
export function useEventSource(options: UseEventSourceOptions) {
  const {
    enabled,
    buildUrl,
    eventHandlers = {},
    onMessage,
    onOpen,
    onError,
    heartbeatTimeoutMs = DEFAULT_HEARTBEAT_TIMEOUT_MS,
    initialBackoffMs = INITIAL_BACKOFF_MS,
    maxBackoffMs = MAX_BACKOFF_MS,
  } = options;

  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(initialBackoffMs);
  const lastEventIdRef = useRef<string | null>(null);
  const intentionallyClosedRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(false);
  const hasStartedRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);

  const jitter = (ms: number) => {
    const delta = ms * JITTER_PCT;
    return Math.round(ms + (Math.random() * 2 - 1) * delta);
  };

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const closeES = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const scheduleHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
    }
    heartbeatTimerRef.current = setTimeout(() => {
      if (!mountedRef.current || !enabled) return;
      console.warn("[SSE] Heartbeat timeout — reconnecting");
      reopen();
    }, heartbeatTimeoutMs);
  }, [heartbeatTimeoutMs, enabled]);

  const onAnyEventActivity = useCallback(
    (e?: MessageEvent) => {
      if (e?.lastEventId) {
        lastEventIdRef.current = e.lastEventId;
      }
      scheduleHeartbeat();
    },
    [scheduleHeartbeat]
  );

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !enabled) return;
    if (reconnectTimerRef.current) return; // already scheduled

    const delay = jitter(backoffRef.current);
    console.warn(`[SSE] Scheduling reconnect in ${delay}ms`);

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      open();
    }, delay);

    backoffRef.current = Math.min(backoffRef.current * 2, maxBackoffMs);
  }, [enabled, maxBackoffMs]);

  const open = useCallback(() => {
    if (!mountedRef.current || !enabled) return;

    // Reset
    clearTimers();
    closeES();
    intentionallyClosedRef.current = false;

    const url = buildUrl(lastEventIdRef.current);
    if (!url) return;

    console.info("[SSE] Opening connection", url);

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("open", async () => {
      backoffRef.current = initialBackoffMs;
      setIsConnected(true);
      onAnyEventActivity();
      await onOpen?.();
      console.info("[SSE] Open");
    });

    // Named events
    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      es.addEventListener(eventName, (event: MessageEvent) => {
        onAnyEventActivity(event);
        handler(event);
      });
    });

    // Default "message"
    if (onMessage) {
      es.addEventListener("message", (event: MessageEvent) => {
        onAnyEventActivity(event);
        onMessage(event);
      });
    } else {
      es.addEventListener("message", (event: MessageEvent) => {
        onAnyEventActivity(event);
      });
    }

    es.onerror = (err) => {
      console.warn("[SSE] Error", err);
      setIsConnected(false);
      closeES();
      onError?.(err);
      if (!intentionallyClosedRef.current) {
        scheduleReconnect();
      }
    };

    scheduleHeartbeat();
  }, [
    buildUrl,
    clearTimers,
    closeES,
    eventHandlers,
    initialBackoffMs,
    onAnyEventActivity,
    onError,
    onMessage,
    onOpen,
    scheduleHeartbeat,
    scheduleReconnect,
    enabled,
  ]);

  const reopen = useCallback(() => {
    if (!mountedRef.current || !enabled) return;
    open();
  }, [open, enabled]);

  // Mount / unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      intentionallyClosedRef.current = true;
      clearTimers();
      closeES();
    };
  }, [clearTimers, closeES]);

  // React to enabled flag
  useEffect(() => {
    if (!mountedRef.current) return;
    if (enabled && !hasStartedRef.current) {
      // enabled just turned true
      hasStartedRef.current = true;
      backoffRef.current = initialBackoffMs;
      console.log("[SSE] Opening connection (enabled transition)");
      open();
    } else if (!enabled && hasStartedRef.current) {
      // enabled just turned false
      hasStartedRef.current = false;
      intentionallyClosedRef.current = true;
      clearTimers();
      closeES();
    }
  }, [enabled, open, clearTimers, closeES, initialBackoffMs]);

  // Online / offline / visibility lifecycle
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onOnline = () => {
      if (!enabled) return;
      console.info("[SSE] Browser online — reconnecting now");
      backoffRef.current = initialBackoffMs;
      reopen();
    };

    const onOffline = () => {
      console.warn("[SSE] Browser offline — closing connection");
      clearTimers();
      closeES();
      setIsConnected(false);
    };

    const onVisibilityChange = () => {
      console.info(`[SSE] Tab visible -- sse enabled: ${enabled}`);
      if (document.visibilityState === "visible") {
        if (!enabled) return;
        console.info("[SSE] Tab visible — restarting connection");
        backoffRef.current = initialBackoffMs;
        reopen();
      } else if (document.visibilityState === "hidden") {
        // When tab hidden, pause SSE to save resources
        console.info("[SSE] Tab hidden — pausing SSE");
        clearTimers();
        closeES();
        // IMPORTANT: do NOT mark intentionallyClosed true, so we know we want it back
        setIsConnected(false);
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [clearTimers, closeES, reopen, enabled, initialBackoffMs]);

  return {
    isConnected,
    lastEventId: lastEventIdRef.current,
    reopen,
    close: () => {
      intentionallyClosedRef.current = true;
      clearTimers();
      closeES();
    },
  };
}
