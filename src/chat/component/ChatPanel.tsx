'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@chat/hooks';
import { ChatMessage } from 'amazon-ivs-chat-messaging';
import { ChatInput } from './ChatInput';
import { ChatControl } from './ChatControl';
import { ChatMessageBubble } from './ChatMessageBubble';
import { useBroadcastUser } from '@/broadcast/hooks/use-broadcast-user';
import { OfferChatBubble } from '@/offer/components';

export function ChatPanel() {
  const { connect, filteredMessages, connected } = useChat();
  const { userId } = useBroadcastUser();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!connected) {
      connect();
    }
  }, [connected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [filteredMessages]);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-md border p-2 shadow bg-background">
      {/* Scrollable message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pr-2 scroll-smooth"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-sm text-muted-foreground">No messages yet</div>
        ) : (
          filteredMessages.map((msg: ChatMessage) => (
            <div key={msg.id} className="text-sm text-foreground">
              <ChatMessageBubble
                name={msg.sender.attributes?.name || 'unknown'}
                content={msg.content}
                isSelf={msg.sender.userId === userId}
              />
            </div>
          ))
        )}
      </div>

      {/** Offer Bubble */}
      <OfferChatBubble />

      {/* Controls pinned at bottom */}
      <div className="mt-2 border-t pt-2">
        <ChatControl />
        <ChatInput />
      </div>
    </div>
  );
}
