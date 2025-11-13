// ChatPanel.tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '@chat/hooks';
import { ChatMessage } from 'amazon-ivs-chat-messaging';
import { ChatInput } from './ChatInput';
import { ChatControl } from './ChatControl';
import { ChatMessageBubble } from './ChatMessageBubble';
import { useBroadcastUser } from '@/broadcast/hooks/use-broadcast-user';
import { OfferChatBubble } from '@/offer/components';
import clsx from 'clsx';

interface ChatPanelProps {
  /** Hide composer (Control + Input) so parent can place it in a sticky footer */
  hideComposer?: boolean;
  className?: string;
}

export function ChatPanel({ hideComposer = false, className }: ChatPanelProps) {
  const { connect, filteredMessages, connected } = useChat();
  const { userId } = useBroadcastUser();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoStick, setAutoStick] = useState(true); // only autoscroll if user is near bottom

  useEffect(() => {
    if (!connected) connect();
  }, [connected, connect]);

  // Track whether user is near the bottom; if so, we auto-scroll on new messages
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setAutoStick(distanceFromBottom < 75); // ~4.5rem tolerance
  }, [scrollRef.current]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (autoStick) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [filteredMessages, autoStick]);

  return (
    <div className={clsx("flex flex-col h-full rounded-md border shadow bg-background", className)}>
      {/* Scrollable message list */}
      <div
        ref={scrollRef}
        className="flex-1 h-full overflow-y-auto pr-2 scroll-smooth overscroll-contain"
        onScroll={handleScroll}
      >
        {filteredMessages.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No messages yet</div>
        ) : (
          <div className="px-2 py-2 space-y-2">
            {filteredMessages.map((msg: ChatMessage) => (
              <div key={msg.id} className="text-sm text-foreground">
                <ChatMessageBubble
                  name={msg.sender.attributes?.name || 'unknown'}
                  content={msg.content}
                  isSelf={msg.sender.userId === userId}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Composer (controls + input) */}
      {!hideComposer && (
        <div className="border-t p-2 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <OfferChatBubble />
          <ChatControl />
          <ChatInput />
        </div>
      )}
    </div>
  );
}
