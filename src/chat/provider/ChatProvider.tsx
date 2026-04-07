import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatContext } from "../context/ChatContext"
import { ChatEvent, ChatMessage, ChatRoom, DeleteMessageEvent, DisconnectUserEvent, SendMessageRequest } from "amazon-ivs-chat-messaging";
import { ChatConfigUpdate, ChatMetadata, ChatRecipient } from "../service/type";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { useChatConfiguration } from "../hooks/use-chat-configuration";
import { useWebinar } from "@/webinar/hooks";
import { onPlaybackPlaying } from "@/emitter/playback";
import { chatConfigUpdateSchema } from "../service/schema";
import { moderateText } from "../service/moderation";
import { getAttendeeChatSession } from "../service/action";
import { useChatRuntime } from "../hooks/use-chat-runtime";
import { useAudienceEvent } from "@/audience-events/hooks/use-audience-event";
import { emitAudienceChatEvent } from "@/audience-events/service/event-emitter";

const RECONNECT_START_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10000;
const RECONNECT_MAX_ATTEMPTS = 10;
const MAX_CHAT_ITEMS = 100;
const CHAT_SEND_INTERVAL_MS = Math.ceil(1000 / 3);

export type ChatProviderProps = {
    children: React.ReactNode,
    initialChatConfig?: ChatConfigUpdate | null
}

export function ChatProvider({ children, initialChatConfig }: ChatProviderProps) {

    const { registrantId, currentUserRole, enabled, sessionId } = useChatRuntime()
    const { recordEvent } = useWebinar()
    const { region, tokenProvider } = useChatConfiguration()
    const roomRef = useRef<ChatRoom | null>(null);
    const tokenProviderRef = useRef(tokenProvider);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([])
    const [events, setEvents] = useState<ChatEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error">("idle");
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const [reconnectDelayMs, setReconnectDelayMs] = useState<number | null>(null);
    const [chatConfig, setChatConfig] = useState<ChatConfigUpdate | null>(initialChatConfig ?? null);
    const hasFetchedOnPlayRef = useRef(false);
    const listenerUnsubs = useRef<(() => void)[]>([]);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptRef = useRef(0);
    const connectInFlightRef = useRef(false);
    const manualDisconnectRef = useRef(false);
    const connectRef = useRef<(() => Promise<() => void>) | null>(null);
    const nextLocalMessageIdRef = useRef(0);
    const lastChatSendAtRef = useRef(0);
    const sendQueueRef = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        tokenProviderRef.current = tokenProvider;
    }, [tokenProvider]);

    const stableTokenProvider = useCallback(async () => tokenProviderRef.current(), []);

    const room = useMemo(
        () =>
            new ChatRoom({
                regionOrUrl: `wss://edge.ivschat.${region}.amazonaws.com`,
                tokenProvider: stableTokenProvider,
            }),
        [region, stableTokenProvider]
    );

    useEffect(() => {
        const previousRoom = roomRef.current;
        if (previousRoom && previousRoom !== room) {
            previousRoom.disconnect();
        }

        roomRef.current = room;

        return () => {
            room.disconnect();
            if (roomRef.current === room) {
                roomRef.current = null;
            }
        };
    }, [room]);

    const clearReconnectTimer = useCallback(() => {
        if (!reconnectTimerRef.current) return;
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
        setReconnectDelayMs(null);
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (manualDisconnectRef.current) return;
        if (reconnectTimerRef.current) return;

        const currentAttempt = reconnectAttemptRef.current;
        if (currentAttempt >= RECONNECT_MAX_ATTEMPTS) {
            setConnectionStatus("error");
            setReconnectDelayMs(null);
            return;
        }
        const nextAttempt = currentAttempt + 1;
        const baseDelay = Math.min(
            RECONNECT_START_DELAY_MS * Math.pow(2, Math.max(0, currentAttempt)),
            RECONNECT_MAX_DELAY_MS
        );
        const jitter = Math.floor(Math.random() * 300);
        const delay = baseDelay + jitter;

        reconnectAttemptRef.current = nextAttempt;
        setReconnectAttempt(nextAttempt);
        setReconnectDelayMs(delay);
        setConnectionStatus("reconnecting");

        reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            setReconnectDelayMs(null);
            connectRef.current?.().catch(() => {
                // next retry will be scheduled by connect failure/disconnect listener
            });
        }, delay);
    }, []);

    const processMessage = (messages: ChatMessage[], role: "host" | "presenter" | "attendee", registrantId: string) => {
        const isHostTeam = role === "host" || role === "presenter";

        return messages.filter((message) => {
            const messageRecipient = message.attributes?.recipient;
            const isSelf = message.sender.userId === registrantId;

            if (messageRecipient === DefaultChatRecipient.EVERYONE || !messageRecipient) return true;
            if (isSelf) return true;

            if (messageRecipient === DefaultChatRecipient.HOST) return isHostTeam;

            return isHostTeam;
        });
    }

    const connect = useCallback(async () => {
        if (room.state === "connected") return () => {
            room.disconnect();
        };;
        if (connectInFlightRef.current) return () => {
            room.disconnect();
        };

        connectInFlightRef.current = true;
        manualDisconnectRef.current = false;
        setConnectionStatus(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");
        listenerUnsubs.current.forEach((unsubscribe) => unsubscribe());
        listenerUnsubs.current = [];
        clearReconnectTimer();

        listenerUnsubs.current.push(
            room.addListener('connecting', () => {
                setConnected(false);
                setConnectionStatus(reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting");
            }),
            room.addListener('connect', () => {
                setConnected(true);
                setConnectionStatus("connected");
                reconnectAttemptRef.current = 0;
                setReconnectAttempt(0);
                clearReconnectTimer();
            }),
            room.addListener('disconnect', () => {
                setConnected(false);
                if (manualDisconnectRef.current) {
                    setConnectionStatus("disconnected");
                    return;
                }
                scheduleReconnect();
            }),
            room.addListener('message', (message: ChatMessage) => {
                setMessages((prev) => [...prev, message].slice(-MAX_CHAT_ITEMS));
            }),
            room.addListener('event', (event: ChatEvent) => {
                setEvents((prev) => [...prev, event].slice(-MAX_CHAT_ITEMS));
                emitAudienceChatEvent(event);
            }),
            room.addListener('messageDelete', (event: DeleteMessageEvent) => {
                setMessages((prev) => prev.filter((message) => message.id !== event.messageId));
            }),
            room.addListener('userDisconnect', (event: DisconnectUserEvent) => {
                if(registrantId === event.userId) {
                    manualDisconnectRef.current = true;
                    roomRef.current?.disconnect();
                    setConnected(false);
                    setConnectionStatus("disconnected");
                }
            })
        )

        try {
            await room.connect();
        } catch {
            setConnected(false);
            setConnectionStatus("error");
            scheduleReconnect();
            throw new Error("Chat connection failed");
        } finally {
            connectInFlightRef.current = false;
        }

        return () => {
            manualDisconnectRef.current = true;
            clearReconnectTimer();
            room.disconnect();
            setConnected(false);
            setConnectionStatus("disconnected");
        };
    }, [clearReconnectTimer, room, scheduleReconnect, registrantId]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const sendMessage = useCallback(async (content: string, recipient: ChatRecipient = defaultRecipient(DefaultChatRecipient.EVERYONE)) => {
        const validation = moderateText(content, {
            role: currentUserRole,
            profanityMode: "block",
        });

        if (!validation.ok) {
            nextLocalMessageIdRef.current += 1;
            setMessages((prev) => [...prev, {
                id: `local-blocked-${nextLocalMessageIdRef.current}`,
                sender: {
                    userId: registrantId
                },
                sendTime: new Date(),
                content: content,
                attributes: {
                    "name": "You",
                    "local_status": "blocked",
                    "blocked_reasons": validation.reasons?.map((reason) => reason.message).join(" ") ?? ""
                } as Record<string, string>
            } as ChatMessage].slice(-MAX_CHAT_ITEMS));
            return
        }

        const queuedSend = sendQueueRef.current.then(async () => {
            const room = roomRef.current;
            if (!room || room.state !== "connected") return;

            const elapsedMs = Date.now() - lastChatSendAtRef.current;
            const waitMs = Math.max(0, CHAT_SEND_INTERVAL_MS - elapsedMs);

            if (waitMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, waitMs));
            }

            const activeRoom = roomRef.current;
            if (!activeRoom || activeRoom.state !== "connected") return;

            lastChatSendAtRef.current = Date.now();

            const request = new SendMessageRequest(content);

            request.attributes = {
                recipient: recipient.value
            } as ChatMetadata

            try {
                await activeRoom.sendMessage(request);
                await recordEvent("chat_message")
            } catch (err) {
                console.error('[IVS Chat] Failed to send message', err);
            }
        });

        sendQueueRef.current = queuedSend.catch(() => {});
        await queuedSend;
    }, [recordEvent, registrantId, currentUserRole]);

    const disconnect = useCallback(() => {
        manualDisconnectRef.current = true;
        clearReconnectTimer();
        roomRef.current?.disconnect();
        setConnected(false);
        setConnectionStatus("disconnected");
    }, [clearReconnectTimer]);

    const reconnectNow = useCallback(() => {
        manualDisconnectRef.current = false;
        reconnectAttemptRef.current = 0;
        setReconnectAttempt(0);
        clearReconnectTimer();
        connectRef.current?.().catch(() => {
            scheduleReconnect();
        });
    }, [clearReconnectTimer, scheduleReconnect]);

    useEffect(() => {
        if (!enabled) {
            disconnect();
            return;
        }

        connect().catch(() => {
            scheduleReconnect();
        });
    }, [enabled, connect, disconnect, scheduleReconnect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            listenerUnsubs.current.forEach((unsubscribe) => unsubscribe());
            listenerUnsubs.current = [];
            clearReconnectTimer();
            disconnect();
        };
    }, [disconnect, clearReconnectTimer]);

    useEffect(() => {
        const filteredMessages = processMessage(messages, currentUserRole, registrantId)
        setFilteredMessages(filteredMessages)
    }, [messages, setFilteredMessages, currentUserRole, registrantId])

    useEffect(() => {
        if (initialChatConfig) {
            setChatConfig(initialChatConfig);
        }
    }, [initialChatConfig])

    useEffect(() => {
        return onPlaybackPlaying(() => {
            if (hasFetchedOnPlayRef.current) return;
            hasFetchedOnPlayRef.current = true;
            getAttendeeChatSession({ sessionId }).then((result) => {
                if (result?.data) setChatConfig(result.data);
            });
        });
    }, [sessionId]);

    useEffect(() => {
        const handleStreamRefresh = () => {
            getAttendeeChatSession({ sessionId }).then((result) => {
                if (result?.data) setChatConfig(result.data);
            });
        };
        window.addEventListener("webinar:stream:refresh", handleStreamRefresh);
        return () => window.removeEventListener("webinar:stream:refresh", handleStreamRefresh);
    }, [sessionId]);

    useAudienceEvent({
        eventType: "chat:config:update",
        schema: chatConfigUpdateSchema,
        sessionId,
        getStateScope: (evt) => evt.payload.chat_session_id,
        compareEventKeys: (incoming, latestApplied) => incoming.localeCompare(latestApplied),
        onEvent: (event) => {
            setChatConfig({
                session_id: event.session_id,
                ...event.payload,
            });
        },
        getSignature: (evt) => `${evt.payload.chat_session_id}-${evt.payload.mode}-${evt.payload.is_enabled}-${evt.payload.is_active}-${evt.payload.pinned_announcements.length}`,
    })

    return <ChatContext.Provider value={{
        connect,
        disconnect,
        connectionStatus,
        reconnectAttempt,
        reconnectDelayMs,
        reconnectNow,
        sendMessage,
        messages,
        filteredMessages,
        events,
        connected,
        chatConfig,
    }}>
        {children}
    </ChatContext.Provider>
}
