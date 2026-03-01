'use client';

import { useEffect } from 'react';
import { OfferChatBubble } from '@/offer-client/components/OfferChatBubble';
import { ChatControl } from './ChatControl';
import { ChatInput } from './ChatInput';
import { useChat } from '../hooks';
import { useChatControl } from '../hooks/use-chat-control';
import { defaultRecipient } from '../service/utils';
import { DefaultChatRecipient } from '../service/enum';

export function ChatComposer() {
  const { chatConfig } = useChat();
  const { setChatRecipient } = useChatControl();
  const isLocked = chatConfig?.mode === 'locked';

  // Keep the active recipient in sync with the chat mode so sendMessage always
  // uses the right value regardless of which layout renders this composer.
  useEffect(() => {
    if (chatConfig?.mode === 'private') {
      setChatRecipient(defaultRecipient(DefaultChatRecipient.HOST));
    } else if (chatConfig?.mode === 'public') {
      setChatRecipient(defaultRecipient(DefaultChatRecipient.EVERYONE));
    }
  }, [chatConfig?.mode, setChatRecipient]);

  return (
    <div
      className="
        z-30 relative px-3 py-2
        backdrop-blur-md
        bg-background/85 supports-[backdrop-filter]:bg-background/70
        dark:bg-[#0D0F12]/80 dark:supports-[backdrop-filter]:bg-[#0D0F12]/60
        shadow-[0_-8px_24px_rgba(0,0,0,0.06)]
        dark:shadow-[0_-10px_30px_rgba(0,0,0,0.45)]
        before:absolute before:inset-x-0 before:top-0 before:h-px
        before:bg-gradient-to-r before:from-transparent before:via-[#25D366]/25 before:to-transparent
        dark:before:via-[#25D366]/35
      "
    >
      <OfferChatBubble />
      <ChatControl />
      <ChatInput isLocked={isLocked} />
    </div>
  );
}
