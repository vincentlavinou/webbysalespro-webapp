'use client';

import { ChatComposer as PlatformChatComposer } from "@lavinou/webbysalespro/chat/ui";
import { ChatRegistrationGate } from './ChatRegistrationGate';
import { useChat } from '../hooks';
import { useChatRuntime } from '../hooks/use-chat-runtime';

/**
 * The recipient label and the message box.
 *
 * The shared composer owns which of the four states renders — unavailable,
 * read-only, gated, composing — and fixes the bug this fork had: it called
 * `sendMessage` and cleared the box in the next statement without ever looking
 * at the result, so a message moderation held back vanished with no reason
 * given. The draft stays put now and the reason is shown inline.
 *
 * The recipient-syncing effect is gone with it. It set the recipient from the
 * chat mode after render, so a message sent before that effect settled carried
 * the previous scope. The composer derives the recipient instead, from the
 * sender's seat and the mode, with no window in which the two disagree.
 *
 * The chrome stays here — the floating blurred bar is this surface's, not the
 * composer's.
 */
export function ChatComposer() {
  const { chatConfig, connected, sendMessage } = useChat();
  const { currentUserRole, requiresRegistration } = useChatRuntime();

  return (
    <PlatformChatComposer
      role={currentUserRole}
      mode={chatConfig?.mode}
      isEnabled={chatConfig?.is_enabled !== false}
      connected={connected}
      onSend={(content, recipient) => sendMessage(content, recipient)}
      // Generic-link guests may read the room but hold a view-only token until
      // they claim an identity. The composer checks this after the disabled and
      // locked states, because registering unlocks neither.
      gate={requiresRegistration ? <ChatRegistrationGate /> : undefined}
      className="
        z-30 relative
        backdrop-blur-md
        bg-background/85 supports-[backdrop-filter]:bg-background/70
        dark:bg-[#0D0F12]/80 dark:supports-[backdrop-filter]:bg-[#0D0F12]/60
        shadow-[0_-8px_24px_rgba(0,0,0,0.06)]
        dark:shadow-[0_-10px_30px_rgba(0,0,0,0.45)]
        before:absolute before:inset-x-0 before:top-0 before:h-px
        before:bg-gradient-to-r before:from-transparent before:via-primary/25 before:to-transparent
        dark:before:via-primary/35
      "
    />
  );
}
