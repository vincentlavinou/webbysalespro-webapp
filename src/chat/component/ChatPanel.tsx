'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@chat/hooks';
import { ChatMessage } from 'amazon-ivs-chat-messaging';
import { ChatInput } from './ChatInput';
import { ChatControl } from './ChatControl';
import { ChatMessageBubble } from './ChatMessageBubble';
import { useBroadcastUser } from '@/broadcast/hooks/use-broadcast-user';
import { useWebinar } from '@/webinar/hooks';
import { VisibleOffer } from '@/webinar/components';
import { Button } from '@/components/ui/button';

export function ChatPanel() {
  const { connect, filteredMessages, connected } = useChat();
  const { userId } = useBroadcastUser();
  const { session, webinar } = useWebinar()
  const [isOfferOpen, setOfferOpen] = useState(false);
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
          filteredMessages.map((msg: ChatMessage) => {
            return (
              <div key={msg.id} className="text-sm text-foreground">
                <ChatMessageBubble
                  name={msg.sender.attributes?.name || 'unknown'}
                  content={msg.content}
                  isSelf={msg.sender.userId === userId}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Offer pinned above input */}
      {session?.offer_visible && !isOfferOpen && webinar && (
        <div className="mt-2">
          <VisibleOffer offer={webinar.offers[0]} onClick={() => setOfferOpen(true)} />
        </div>
      )}

      {/* Offer drawer area — expand as needed */}
      {isOfferOpen && (
        <div className="mt-2 p-4 border rounded bg-secondary max-h-[300px] overflow-y-auto">
          <h3 className="font-semibold">{webinar?.offers[0]?.headline}</h3>
          <p className="text-sm text-muted-foreground mt-1">{webinar?.offers[0]?.description}</p>
          <p className="text-sm text-primary mt-2">
            {webinar?.offers[0]?.currency_display} {webinar?.offers[0]?.price}
          </p>
          <Button className="mt-3 w-full">Buy Now</Button>
          <Button variant="ghost" className="mt-1 w-full text-xs" onClick={() => setOfferOpen(false)}>
            Close
          </Button>
        </div>
      )}

      {/* Controls pinned at bottom */}
      <div className="mt-2 border-t pt-2">
        <ChatControl />
        <ChatInput />
      </div>
    </div>
  );
}
