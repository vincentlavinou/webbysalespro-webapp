import { useCallback, useEffect, useRef, useState } from "react";
import { ChatContext } from "../context/ChatContext"
import { ChatEvent, ChatMessage, ChatRoom, DeleteMessageEvent, DisconnectUserEvent, SendMessageRequest } from "amazon-ivs-chat-messaging";
import { ChatMetadata, ChatRecipient } from "../service/type";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { useChatConfiguration } from "../hooks/use-chat-configuration";
import { useChatControl } from "../hooks/use-chat-control";
import { useBroadcastUser } from "@/broadcast/hooks/use-broadcast-user";
import { useWebinar } from "@/webinar/hooks";

export type ChatProviderProps = {
    children: React.ReactNode
}

export function ChatProvider({children}: ChatProviderProps) {

    const {userId} = useBroadcastUser()
     const {recordEvent} = useWebinar()
    const {region, tokenProvider} = useChatConfiguration()
    const {recipient} = useChatControl()
    const roomRef = useRef<ChatRoom | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([])
    const [events, setEvents] = useState<ChatEvent[]>([]);
    const [connected, setConnected] = useState(false);

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
            const recipientId = message.attributes?.recipientId;

            if (recipient.value === DefaultChatRecipient.EVERYONE) return true

            return message.sender.userId === userId || recipientId === userId;
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
            await recordEvent("chat_message")
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
    },[messages, setFilteredMessages, recipient, userId])
    

    return <ChatContext.Provider value={{
        connect,
        disconnect,
        sendMessage,
        messages,
        filteredMessages,
        events,
        connected,
    }}>
        {children}
    </ChatContext.Provider>
}