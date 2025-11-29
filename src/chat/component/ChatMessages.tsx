// ChatPanel.tsx
'use client';

import { useEffect, RefObject } from 'react';
import { useChat } from '@chat/hooks';
import type { ChatMessage } from 'amazon-ivs-chat-messaging';
import { ChatMessageBubble } from './ChatMessageBubble';
import { useBroadcastUser } from '@/broadcast/hooks/use-broadcast-user';

interface ChatMessagesProps {
  scrollRef: RefObject<HTMLDivElement | null>
  autoStick: boolean
}

export function ChatMessages({ scrollRef, autoStick }: ChatMessagesProps) {
  const { connect, filteredMessages, connected } = useChat();
  const { userId } = useBroadcastUser();

  // Connect once
  useEffect(() => {
    if (!connected) connect();
  }, [connected, connect]);

  // Auto-stick to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoStick) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [filteredMessages, autoStick, scrollRef]);

  if (filteredMessages.length === 0) {
    return (
      <div className="p-3 text-sm text-muted-foreground">
        No messages yet
      </div>
    );
  }

  return (
    <div className="px-1 py-2 space-y-1">
      {filteredMessages.map((msg: ChatMessage) => {
        return (
          <div key={msg.id} className="text-sm text-foreground">
            <ChatMessageBubble
              name={msg.sender.attributes?.name || 'unknown'}
              content={msg.content}
              isSelf={msg.sender.userId === userId}
              avatarBgColor={msg.sender.attributes?.avatar_bg_color}
            />
          </div>
        )
      })}
    </div>
  );
}
