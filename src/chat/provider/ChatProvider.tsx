import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatContext } from "../context/ChatContext"
import { ChatEvent, ChatMessage, ChatRoom, DeleteMessageEvent, DisconnectUserEvent, SendMessageRequest } from "amazon-ivs-chat-messaging";
import { ChatConfigUpdate, ChatMetadata, ChatRecipient } from "../service/type";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { useChatConfiguration } from "../hooks/use-chat-configuration";
import { useBroadcastUser } from "@/broadcast/hooks/use-broadcast-user";
import { useWebinar } from "@/webinar/hooks";
import { usePlaybackMetadataEvent } from "@/emitter/playback";
import { chatConfigUpdateSchema } from "../service/schema";
import { useBroadcastConfiguration } from "@/broadcast/hooks";
import { moderateText } from "../service/moderation";

const RECONNECT_START_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 10000;

export type ChatProviderProps = {
    children: React.ReactNode,
    token?: string
    initialChatConfig?: ChatConfigUpdate | null
    currentUserRole?: "host" | "presenter" | "attendee"
}

export function ChatProvider({ children, token, initialChatConfig, currentUserRole = "attendee" }: ChatProviderProps) {

    const { userId } = useBroadcastUser()
    const { recordEvent } = useWebinar()
    const { sessionId } = useBroadcastConfiguration()
    const { region, tokenProvider } = useChatConfiguration()
    const roomRef = useRef<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([])
    const [events, setEvents] = useState<ChatEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error">("idle");
    const [reconnectAttempt, setReconnectAttempt] = useState(0);
    const [reconnectDelayMs, setReconnectDelayMs] = useState<number | null>(null);
    const [chatConfig, setChatConfig] = useState<ChatConfigUpdate | null>(initialChatConfig ?? null);
    const listenerUnsubs = useRef<(() => void)[]>([]);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttemptRef = useRef(0);
    const connectInFlightRef = useRef(false);
    const manualDisconnectRef = useRef(false);
    const connectRef = useRef<(() => Promise<() => void>) | null>(null);

    const room = useMemo(
        () =>
            new ChatRoom({
                regionOrUrl: `wss://edge.ivschat.${region}.amazonaws.com`,
                tokenProvider,
            }),
        [region, tokenProvider]
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
        const nextAttempt = currentAttempt + 1;
        const delay = Math.min(
            RECONNECT_START_DELAY_MS * Math.pow(2, Math.max(0, currentAttempt)),
            RECONNECT_MAX_DELAY_MS
        );

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

    const processMessage = (messages: ChatMessage[], role: "host" | "presenter" | "attendee", userId: string) => {
        const isHostTeam = role === "host" || role === "presenter";

        return messages.filter((message) => {
            const messageRecipient = message.attributes?.recipient;
            const isSelf = message.sender.userId === userId;

            if (messageRecipient === DefaultChatRecipient.EVERYONE || !messageRecipient) return true;
            if (isSelf) return true;

            // Host-targeted private messages should only be visible to host/presenters.
            if (messageRecipient === DefaultChatRecipient.HOST) return isHostTeam;

            // Unknown recipient channels are treated as restricted.
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
        listenerUnsubs.current.forEach((unsubsribe) => unsubsribe())
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
                setMessages((prev) => [...prev, message]);
            }),
            room.addListener('event', (event: ChatEvent) => {
                setEvents((prev) => [...prev, event]);
            }),
            room.addListener('messageDelete', (event: DeleteMessageEvent) => {
                setMessages((prev) => prev.filter((message) => message.id !== event.messageId));
            }),
            room.addListener('userDisconnect', (event: DisconnectUserEvent) => {
                console.log('[IVS Chat] User disconnected', event);
                setMessages((prev) => prev.filter((message) => message.sender.userId !== event.userId));
                if(userId === event.userId) {
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
    }, [clearReconnectTimer, room, scheduleReconnect, userId]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const sendMessage = useCallback(async (content: string, recipient: ChatRecipient = defaultRecipient(DefaultChatRecipient.EVERYONE)) => {
        const room = roomRef.current;
        if (!room || !connected) return;

        const validation = moderateText(content, {
            role: currentUserRole,
            profanityMode: "block",
        });

        if (!validation.ok) {
            setMessages((prev) => [...prev, {
                sender: {
                    userId
                },
                content: content,
                attributes: {
                    "name": "You"
                } as Record<string, string>
            } as ChatMessage]);
            return
        }

        const request = new SendMessageRequest(content);

        request.attributes = {
            recipient: recipient.value
        } as ChatMetadata

        try {
            await room.sendMessage(request);
            if (token) {
                await recordEvent("chat_message", token)
            }
        } catch (err) {
            console.error('[IVS Chat] Failed to send message', err);
        }
    }, [connected, token, recordEvent, userId, currentUserRole]);

    const disconnect = useCallback(() => {
        manualDisconnectRef.current = true;
        clearReconnectTimer();
        roomRef.current?.disconnect();
        setConnected(false);
        setConnectionStatus("disconnected");
    }, [clearReconnectTimer]);

    const reconnectNow = useCallback(() => {
        manualDisconnectRef.current = false;
        clearReconnectTimer();
        connectRef.current?.().catch(() => {
            scheduleReconnect();
        });
    }, [clearReconnectTimer, scheduleReconnect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearReconnectTimer();
            disconnect();
        };
    }, [disconnect, clearReconnectTimer]);

    useEffect(() => {
        const filteredMessages = processMessage(messages, currentUserRole, userId)
        setFilteredMessages(filteredMessages)
    }, [messages, setFilteredMessages, currentUserRole, userId])

    useEffect(() => {
        if (initialChatConfig) {
            setChatConfig(initialChatConfig);
        }
    }, [initialChatConfig])

    usePlaybackMetadataEvent({
        eventType: "chat:config:update",
        schema: chatConfigUpdateSchema,
        sessionId,
        onEvent: (event) => {
            console.debug(event)
            setChatConfig(event.payload);
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
