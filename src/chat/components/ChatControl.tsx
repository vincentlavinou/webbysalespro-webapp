'use client';

import { ChatRecipientControl } from "@lavinou/webbysalespro/chat/ui";
import { useChat } from "../hooks";
import { useChatRuntime } from "../hooks/use-chat-runtime";

/**
 * Who the next message is addressed to.
 *
 * The local version derived a fixed badge from the chat mode alone and ignored
 * the sender's seat entirely, so a host in a private session was told they
 * were writing to "Host & Presenters" — muting the one person the session is
 * being run by.
 *
 * The shared control reads the seat first: staff always reach the room, and
 * only attendees are narrowed by the mode. That is what keeps a link a host
 * drops into a private session visible to everyone.
 */
export function ChatControl() {
  const { currentUserRole } = useChatRuntime();
  const { chatConfig } = useChat();

  return <ChatRecipientControl role={currentUserRole} mode={chatConfig?.mode} />;
}
