import { useCallback, useEffect, useRef, useState } from "react";
import { ChatContext } from "../context/ChatContext"
import { ChatEvent, ChatMessage, ChatRoom, DeleteMessageEvent, DisconnectUserEvent, SendMessageRequest } from "amazon-ivs-chat-messaging";
import { ChatConfigUpdate, ChatMetadata, ChatRecipient } from "../service/type";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { useChatConfiguration } from "../hooks/use-chat-configuration";
import { useChatControl } from "../hooks/use-chat-control";
import { useBroadcastUser } from "@/broadcast/hooks/use-broadcast-user";
import { useWebinar } from "@/webinar/hooks";
import { usePlaybackMetadataEvent } from "@/emitter/playback";
import { chatConfigUpdateSchema } from "../service/schema";
import { useBroadcastConfiguration } from "@/broadcast/hooks";

export type ChatProviderProps = {
    children: React.ReactNode,
    token?: string
    initialChatConfig?: ChatConfigUpdate | null
}

export function ChatProvider({ children, token, initialChatConfig }: ChatProviderProps) {

    const { userId } = useBroadcastUser()
    const { recordEvent } = useWebinar()
    const { sessionId } = useBroadcastConfiguration()
    const { region, tokenProvider } = useChatConfiguration()
    const { recipient } = useChatControl()
    const roomRef = useRef<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([])
    const [events, setEvents] = useState<ChatEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [chatConfig, setChatConfig] = useState<ChatConfigUpdate | null>(initialChatConfig ?? null);
    const listenerUnsubs = useRef<(() => void)[]>([]);

    // instantiate only once
    if (!roomRef.current) {
        roomRef.current = new ChatRoom({
            regionOrUrl: `wss://edge.ivschat.${region}.amazonaws.com`,
            tokenProvider,
        });
    }
    const room = roomRef.current;

    const processMessage = (messages: ChatMessage[], recipient: ChatRecipient, userId: string) => {
        const filteredMessages = messages.filter((message) => {
            const messageRecipient = message.attributes?.recipient;

            if (recipient.value === DefaultChatRecipient.EVERYONE) return true;

            // In host-channel view: show messages the current user sent + all host-targeted messages
            return message.sender.userId === userId || messageRecipient === DefaultChatRecipient.HOST;
        });

        return filteredMessages
    }

    const connect = useCallback(async () => {
        if (room.state === "connected") return () => {
            room.disconnect();
        };;

        listenerUnsubs.current.forEach((unsubsribe) => unsubsribe())

        listenerUnsubs.current.push(
            room.addListener('connecting', () => {
                setConnected(false);
            }),
            room.addListener('connect', () => {
                setConnected(true);
            }),
            room.addListener('disconnect', () => {
                setConnected(false);
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
                    disconnect()
                }
            })
        )

        await room.connect();

        return () => {
            room.disconnect();
        };
    }, []);

    const sendMessage = useCallback(async (content: string, recipient: ChatRecipient = defaultRecipient(DefaultChatRecipient.EVERYONE)) => {
        const room = roomRef.current;
        if (!room || !connected) return;

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
    }, [connected]);

    const disconnect = useCallback(() => {
        roomRef.current?.disconnect();
        setConnected(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    useEffect(() => {
        const filteredMessages = processMessage(messages, recipient, userId)
        setFilteredMessages(filteredMessages)
    }, [messages, setFilteredMessages, recipient, userId])

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
        onError: (erro) => {
            console.error(erro)
        },
        getSignature: (evt) => `${evt.payload.chat_session_id}-${evt.payload.mode}-${evt.payload.is_enabled}-${evt.payload.is_active}-${evt.payload.pinned_announcements.length}`,
    }, [sessionId])

    return <ChatContext.Provider value={{
        connect,
        disconnect,
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