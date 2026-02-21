'use client';

import { OfferChatBubble } from '@/offer-client/components/OfferChatBubble';
import { ChatControl } from './ChatControl';
import { ChatInput } from './ChatInput';

interface ChatComposerProps {
  isLocked?: boolean;
}

export function ChatComposer({ isLocked = false }: ChatComposerProps) {
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
