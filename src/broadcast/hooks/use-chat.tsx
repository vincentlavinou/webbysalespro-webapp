import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChatRoom,
  SendMessageRequest,
  ChatMessage,
  ChatEvent,
  DeleteMessageEvent,
  DisconnectUserEvent,
  ChatToken,
} from 'amazon-ivs-chat-messaging';

export interface UseIVSChatRoomOptions {
  region: string;
  tokenProvider: () => Promise<ChatToken>;
}

export function useIVSChatRoom({ region, tokenProvider }: UseIVSChatRoomOptions) {
  const roomRef = useRef<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<ChatEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(async () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
    }

    const room = new ChatRoom({
      regionOrUrl: `wss://edge.ivschat.${region}.amazonaws.com
`,
      tokenProvider,
    });

    // Add listeners
    const unsubscribeConnecting = room.addListener('connecting', () => {
      console.log('[IVS Chat] Connecting...');
      setConnected(false);
    });

    const unsubscribeConnected = room.addListener('connect', () => {
      console.log('[IVS Chat] Connected');
      setConnected(true);
    });

    const unsubscribeDisconnected = room.addListener('disconnect', () => {
      console.log('[IVS Chat] Disconnected');
      setConnected(false);
    });

    const unsubscribeMessage = room.addListener('message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    });

    const unsubscribeEvent = room.addListener('event', (event: ChatEvent) => {
      setEvents((prev) => [...prev, event]);
    });

    const unsubscribeDelete = room.addListener('messageDelete', (event: DeleteMessageEvent) => {
      console.log('[IVS Chat] Message deleted', event);
    });

    const unsubscribeUserDisconnect = room.addListener('userDisconnect', (event: DisconnectUserEvent) => {
      console.log('[IVS Chat] User disconnected', event);
    });

    await room.connect();
    roomRef.current = room;

    return () => {
      unsubscribeConnecting();
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeMessage();
      unsubscribeEvent();
      unsubscribeDelete();
      unsubscribeUserDisconnect();
      room.disconnect();
    };
  }, [region, tokenProvider]);

  const sendMessage = useCallback(async (content: string) => {
    const room = roomRef.current;
    if (!room || !connected) return;

    const request = new SendMessageRequest(content);

    try {
      await room.sendMessage(request);
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

  return {
    connect,
    disconnect,
    sendMessage,
    messages,
    events,
    connected,
  };
}
