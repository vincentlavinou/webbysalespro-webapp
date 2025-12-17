// ChatComposer.tsx
'use client';

import { OfferChatBubble } from '@/offer-client/components/OfferChatBubble';
import { ChatControl } from './ChatControl';
import { ChatInput } from './ChatInput';

export function ChatComposer() {
  return (
    <div className="z-30 border-t p-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <OfferChatBubble />
      <ChatControl />
      <ChatInput />
    </div>
  );
}
