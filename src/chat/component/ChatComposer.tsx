// ChatComposer.tsx
'use client';

import { OfferChatBubble } from '@/offer-client/components/OfferChatBubble';
import { ChatControl } from './ChatControl';
import { ChatInput } from './ChatInput';

interface ChatComposerProps {
  accessToken?: string
}

export function ChatComposer({ accessToken } : ChatComposerProps) {
  return (
    <div className="z-30 border-t p-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {accessToken && <OfferChatBubble />}
      <ChatControl />
      <ChatInput />
    </div>
  );
}
