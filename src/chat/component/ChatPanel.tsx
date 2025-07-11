'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@chat/hooks';
import { ChatMessage } from 'amazon-ivs-chat-messaging';
import { ChatInput } from './ChatInput';
import { ChatControl } from './ChatControl';
import { ChatMessageBubble } from './ChatMessageBubble';

export function ChatPanel() {
  const { connect, filteredMessages, connected } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(!connected) {
      console.log("Connect twice")
      connect()
    }
  }, [connected]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [filteredMessages]);

  return (
    <div className="bg-white rounded-md border h-[80vh] p-4 flex flex-col justify-between shadow">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2 scroll-smooth"
      >
        {filteredMessages.length === 0 ? (
          <div className="text-sm text-gray-600">No messages yet</div>
        ) : (

          filteredMessages.map((msg: ChatMessage) => {
            const timeString = msg.sendTime.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
            hour12: true,
                });
            return (
            <div key={msg.id} className="text-sm text-gray-800">
              <ChatMessageBubble
                name={msg.sender.attributes?.name || "unknown"}
                content={msg.content}
                time={timeString}
                />
            </div>
          )
          })
        )}
      </div>
      <div>
        <ChatControl />
        <ChatInput />
      </div>
    </div>
  );
}
