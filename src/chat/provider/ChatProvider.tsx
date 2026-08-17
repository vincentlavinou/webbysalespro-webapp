'use client';

import { useCallback, useMemo } from "react";
import type { ChatEvent, ChatMessage } from "amazon-ivs-chat-messaging";
import {
  createIvsChatRoom,
  createRoomController,
  ivsChatRequests,
} from "@lavinou/webbysalespro/chat/ivs";
import {
  ChatConfigProvider,
  ChatProvider as PlatformChatProvider,
  useChat as usePlatformChat,
  useChatConfig,
} from "@lavinou/webbysalespro/chat/react";
import { ChatContext } from "../context/ChatContext";
import { useChatConfiguration } from "../hooks/use-chat-configuration";
import { useChatRuntime } from "../hooks/use-chat-runtime";
import { useWebinar } from "@/webinar/hooks";
import { useAudienceEvent } from "@/audience-events/hooks/use-audience-event";
import { emitAudienceChatEvent } from "@/audience-events/service/event-emitter";
import { chatConfigUpdateSchema } from "../service/schema";
import { getAttendeeChatSession } from "../service/action";
import type { ChatConfigUpdate } from "../service/type";

export type ChatProviderProps = {
  children: React.ReactNode;
  initialChatConfig?: ChatConfigUpdate | null;
};

/**
 * Drives the attendee's IVS room through the platform package's controller.
 *
 * Replaces 376 lines that owned the socket, the reconnect schedule, the
 * transcript and the config all at once. What behaves differently now:
 *
 * - a redelivered message on reconnect no longer appears twice;
 * - the send throttle no longer locks the sender out for the size of a
 *   backwards wall-clock step;
 * - config re-hydrates on **every** reconnect. The old code latched its
 *   refetch behind `hasFetchedOnPlayRef`, so it fired at most once for the
 *   life of the page and a socket that dropped an hour later left the panel
 *   quietly stale until reload.
 */
export function ChatProvider({ children, initialChatConfig }: ChatProviderProps) {
  const { registrantId, currentUserRole, enabled, sessionId } = useChatRuntime();
  const { region, tokenProvider } = useChatConfiguration();

  const viewer = useMemo(
    () => ({ userId: registrantId, role: currentUserRole }),
    [registrantId, currentUserRole],
  );

  // Built once per room identity. A new controller reconnects, so nothing that
  // changes during a session belongs in these deps — `tokenProvider` is
  // deliberately absent, since ChatManager holds it in a ref for that reason.
  const controller = useMemo(
    () =>
      createRoomController({
        room: createIvsChatRoom({ region, tokenProvider }),
        requests: ivsChatRequests,
        viewer,
        // The seam that lets audience events ride the IVS chat connection this
        // attendee already holds, instead of costing a Pusher connection each.
        onChatEvent: (event) => emitAudienceChatEvent(event as ChatEvent),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [region, registrantId, currentUserRole],
  );

  const hydrate = useCallback(async () => {
    if (!sessionId) return null;
    const result = await getAttendeeChatSession({ sessionId });
    return result?.data ?? null;
  }, [sessionId]);

  return (
    <PlatformChatProvider source={controller} viewer={viewer} autoConnect={enabled}>
      <ChatConfigProvider initialConfig={initialChatConfig} hydrate={hydrate}>
        <ChatConfigEvents sessionId={sessionId} />
        <ChatContextBridge>{children}</ChatContextBridge>
      </ChatConfigProvider>
    </PlatformChatProvider>
  );
}

/**
 * Refetches the config when a `chat:config:update` lands.
 *
 * The event carries the whole config, but this refetches rather than applying
 * the payload: the `GET` and the event are built by the same
 * `build_chat_config_payload`, so they cannot disagree, and going through one
 * path means there is only one shape to keep correct. Config events are rare —
 * a host toggling a setting — so the extra request costs nothing.
 */
function ChatConfigEvents({ sessionId }: { sessionId: string }) {
  const { refresh } = useChatConfig();

  useAudienceEvent({
    eventType: "chat:config:update",
    schema: chatConfigUpdateSchema,
    sessionId,
    targetAudience: "attendee",
    getStateScope: (event) => event.payload.chat_session_id,
    onEvent: () => void refresh(),
  });

  return null;
}

/**
 * Publishes the platform hooks' state on this app's own `ChatContext`.
 *
 * A shim, so adopting the shared controller did not mean rewriting every
 * consumer at once. Call sites can move to the platform hooks a few at a time
 * and this can go when the last one has.
 */
function ChatContextBridge({ children }: { children: React.ReactNode }) {
  const chat = usePlatformChat();
  const { config } = useChatConfig();
  const { recordEvent } = useWebinar();

  const sendMessage = useCallback(
    async (content: string, recipient: { label: string; value: string }) => {
      const result = await chat.sendMessage(content, recipient);
      if (result.ok) await recordEvent("chat_message");
    },
    [chat, recordEvent],
  );

  // The platform provider owns connect and disconnect; these exist only to
  // satisfy the old context's signature.
  const connect = useCallback(async () => () => {}, []);
  const disconnect = useCallback(() => {}, []);

  const value = useMemo(
    () => ({
      connected: chat.connected,
      connectionStatus: chat.status,
      reconnectAttempt: chat.reconnectAttempt,
      reconnectDelayMs: chat.reconnectDelayMs,
      reconnectNow: () => void chat.reconnectNow(),
      messages: chat.messages as ChatMessage[],
      filteredMessages: chat.visibleMessages as ChatMessage[],
      events: chat.events as ChatEvent[],
      chatConfig: config,
      sendMessage,
      connect,
      disconnect,
    }),
    [chat, config, sendMessage, connect, disconnect],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
