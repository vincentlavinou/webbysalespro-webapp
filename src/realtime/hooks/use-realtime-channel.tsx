"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Channel } from "pusher-js"
import { useEventSource } from "@/sse"
import { webinarApiUrl } from "@/webinar/service"
import { getRealtimeConfig } from "../service/action"
import { RealtimeConfig } from "../service/type"

type RealtimeEventHandler = (data: unknown) => void

// Dead-connection detection: pusher-js pings after this much inactivity, then
// reconnects if no pong arrives within PUSHER_PONG_TIMEOUT_MS. Tuned tighter
// than the default (~120s) so a silently dropped socket reconnects — and
// re-fires onOpen → getSession — fast, instead of stranding an attendee in a
// holding room past the live transition.
const PUSHER_ACTIVITY_TIMEOUT_MS = 30_000
const PUSHER_PONG_TIMEOUT_MS = 15_000

export interface UseRealtimeChannelOptions {
    enabled: boolean
    sessionId: string
    attendeeToken: string | undefined
    eventHandlers?: Record<string, RealtimeEventHandler>
    onOpen?: () => Promise<void>
    onError?: (error: unknown) => void
    onTokenExpired?: () => Promise<unknown>

    /**
     * Builds the SSE URL when falling back from Pusher. Mirrors the existing
     * useEventSource contract — called with the last seen event id.
     */
    buildSseUrl: (lastEventId: string | null) => string

    heartbeatTimeoutMs?: number
    initialBackoffMs?: number
    maxBackoffMs?: number
}

/**
 * Pusher + SSE transport selector for attendee realtime events.
 *
 * Fetches /v2/realtime/config once on enable. When `use_pusher` is true,
 * subscribes to the private session channel via pusher-js. When it is false
 * (or the config call fails), falls back to the existing SSE hook so a
 * server-side cutover requires no code change.
 *
 * Handlers receive the parsed event payload regardless of transport.
 */
export function useRealtimeChannel(options: UseRealtimeChannelOptions) {
    const {
        enabled,
        sessionId,
        attendeeToken,
        eventHandlers,
        onOpen,
        onError,
        onTokenExpired,
        buildSseUrl,
        heartbeatTimeoutMs,
        initialBackoffMs,
        maxBackoffMs,
    } = options

    const [config, setConfig] = useState<RealtimeConfig | null>(null)
    const [pusherConnected, setPusherConnected] = useState(false)
    // Bumped after a channel-auth refresh to force the subscribe effect to
    // tear down and re-subscribe with the new token (see handleSubscriptionError).
    const [resubscribeNonce, setResubscribeNonce] = useState(0)

    const handlersRef = useRef(eventHandlers)
    useEffect(() => {
        handlersRef.current = eventHandlers
    }, [eventHandlers])

    const onOpenRef = useRef(onOpen)
    useEffect(() => {
        onOpenRef.current = onOpen
    }, [onOpen])

    const onErrorRef = useRef(onError)
    useEffect(() => {
        onErrorRef.current = onError
    }, [onError])

    const onTokenExpiredRef = useRef(onTokenExpired)
    useEffect(() => {
        onTokenExpiredRef.current = onTokenExpired
    }, [onTokenExpired])

    const attendeeTokenRef = useRef(attendeeToken)
    useEffect(() => {
        attendeeTokenRef.current = attendeeToken
    }, [attendeeToken])

    // ---- One-shot config fetch (config is stable for the page lifetime). ----
    useEffect(() => {
        if (!enabled || config !== null) return

        let cancelled = false
        getRealtimeConfig(sessionId)
            .then((cfg) => {
                if (!cancelled) setConfig(cfg)
            })
            .catch((err) => {
                console.error("[Realtime] config fetch failed — falling back to SSE", err)
                if (!cancelled) {
                    setConfig({
                        use_pusher: false,
                        key: "",
                        cluster: "",
                        ws_host: null,
                        ws_port: null,
                        force_tls: true,
                    })
                }
            })

        return () => {
            cancelled = true
        }
    }, [enabled, sessionId, config])

    const usePusher = enabled && !!config?.use_pusher && !!attendeeToken
    const useSse = enabled && config !== null && !config.use_pusher

    // ---- SSE branch: wrap handlers so they receive parsed JSON, not MessageEvent. ----
    const sseEventHandlers = useMemo(() => {
        if (!useSse || !eventHandlers) return undefined
        const wrapped: Record<string, (event: MessageEvent) => void> = {}
        for (const name of Object.keys(eventHandlers)) {
            wrapped[name] = (event: MessageEvent) => {
                try {
                    const data = event.data ? JSON.parse(event.data) : null
                    handlersRef.current?.[name]?.(data)
                } catch (err) {
                    console.error(`[Realtime SSE] parse error for ${name}`, err)
                }
            }
        }
        return wrapped
    }, [useSse, eventHandlers])

    const sse = useEventSource({
        enabled: useSse,
        buildUrl: buildSseUrl,
        eventHandlers: sseEventHandlers,
        onOpen,
        onError: (e) => onError?.(e),
        onTokenExpired,
        heartbeatTimeoutMs,
        initialBackoffMs,
        maxBackoffMs,
    })

    // ---- Pusher branch ----
    useEffect(() => {
        if (!usePusher || !config) return

        // pusher-js is a browser-only library: its module evaluation reads
        // `window` at the top level, which crashes during server evaluation.
        // Load it lazily so it never lands in the server bundle.
        let cancelled = false
        let teardown: (() => void) | null = null

        void import("pusher-js").then(({ default: Pusher }) => {
            if (cancelled) return

            const channelName = `private-webinar-session-${sessionId}`

            const pusher = new Pusher(config.key, {
                cluster: config.cluster,
                forceTLS: config.force_tls,
                activityTimeout: PUSHER_ACTIVITY_TIMEOUT_MS,
                pongTimeout: PUSHER_PONG_TIMEOUT_MS,
                ...(config.ws_host
                    ? {
                          wsHost: config.ws_host,
                          ...(config.ws_port !== null ? { wsPort: config.ws_port } : {}),
                          enabledTransports: ["ws", "wss"],
                      }
                    : {}),
                channelAuthorization: {
                    endpoint: `${webinarApiUrl}/v2/realtime/auth`,
                    transport: "ajax",
                    headersProvider: () => {
                        const token = attendeeTokenRef.current
                        return token ? { Authorization: `Bearer ${token}` } : {}
                    },
                },
            })

            const channel: Channel = pusher.subscribe(channelName)

            const handlerNames = Object.keys(handlersRef.current ?? {})
            const boundHandlers: Array<{ name: string; fn: (data: unknown) => void }> = []
            for (const name of handlerNames) {
                const fn = (data: unknown) => {
                    try {
                        handlersRef.current?.[name]?.(data)
                    } catch (err) {
                        console.error(`[Realtime Pusher] handler error for ${name}`, err)
                    }
                }
                channel.bind(name, fn)
                boundHandlers.push({ name, fn })
            }

            const handleSubscriptionSucceeded = () => {
                setPusherConnected(true)
                void onOpenRef.current?.()
            }

            const handleSubscriptionError = (err: unknown) => {
                setPusherConnected(false)
                const status =
                    typeof err === "object" && err !== null && "status" in err
                        ? (err as { status?: number }).status
                        : undefined
                if (status === 401 || status === 403) {
                    // The channel auth endpoint rejected the token (expired/invalid).
                    // Refresh it, then bump the nonce to tear down and re-subscribe so
                    // the new token is actually used: pusher-js does not auto-retry a
                    // failed subscription, and the subscribe effect reads the token via
                    // ref (not deps), so without this the refreshed token would sit
                    // unused until the next reconnect. Mirrors the SSE branch's
                    // auth:expired → refresh → reconnect.
                    const handler = onTokenExpiredRef.current
                    if (handler) {
                        void Promise.resolve(handler()).then(() => {
                            setResubscribeNonce((n) => n + 1)
                        })
                    }
                }
                onErrorRef.current?.(err)
            }

            channel.bind("pusher:subscription_succeeded", handleSubscriptionSucceeded)
            channel.bind("pusher:subscription_error", handleSubscriptionError)

            pusher.connection.bind("error", (err: unknown) => {
                onErrorRef.current?.(err)
            })

            pusher.connection.bind("disconnected", () => {
                setPusherConnected(false)
            })

            // Backgrounded tabs can keep a socket nominally open while the OS
            // pauses delivery, which means we can miss server-pushed events
            // (e.g. the scheduled → in_progress transition). Mirror the SSE
            // branch: disconnect on hidden, reconnect on visible so
            // subscription_succeeded re-fires onOpen and consumers can refetch.
            const onVisibilityChange = () => {
                if (document.visibilityState === "hidden") {
                    pusher.disconnect()
                } else if (document.visibilityState === "visible") {
                    pusher.connect()
                }
            }
            const onOnline = () => {
                pusher.connect()
            }
            const onOffline = () => {
                pusher.disconnect()
            }
            document.addEventListener("visibilitychange", onVisibilityChange)
            window.addEventListener("online", onOnline)
            window.addEventListener("offline", onOffline)

            teardown = () => {
                document.removeEventListener("visibilitychange", onVisibilityChange)
                window.removeEventListener("online", onOnline)
                window.removeEventListener("offline", onOffline)
                for (const { name, fn } of boundHandlers) {
                    channel.unbind(name, fn)
                }
                channel.unbind("pusher:subscription_succeeded", handleSubscriptionSucceeded)
                channel.unbind("pusher:subscription_error", handleSubscriptionError)
                pusher.unsubscribe(channelName)
                pusher.disconnect()
                setPusherConnected(false)
            }
        })

        return () => {
            cancelled = true
            teardown?.()
        }
    }, [usePusher, config, sessionId, resubscribeNonce])

    return {
        transport: usePusher ? ("pusher" as const) : useSse ? ("sse" as const) : null,
        isConnected: usePusher ? pusherConnected : sse.isConnected,
    }
}
