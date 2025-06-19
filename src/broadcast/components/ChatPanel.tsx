'use client';

import { useEffect, useRef, useState } from 'react';
import { useIVSChatRoom } from '../hooks/use-chat';
import { ChatMessage, ChatToken } from 'amazon-ivs-chat-messaging';

export interface ChatPanelProps {
  region: string
  provider: () => Promise<ChatToken>
}

export function ChatPanel({ region, provider }: ChatPanelProps) {
  const { connect, sendMessage, messages, connected } = useIVSChatRoom({
    region: region,
    tokenProvider: provider,
  });

  const [inputValue, setInputValue] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (content) {
      sendMessage(content);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white rounded-md border h-[80vh] p-4 flex flex-col justify-between shadow">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 pr-2 scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-gray-600">No messages yet</div>
        ) : (
          messages.map((msg: ChatMessage) => (
            <div key={msg.id} className="text-sm text-gray-800">
              <span className="font-medium">
                {msg.sender?.userId ?? 'Unknown'}:
              </span>{' '}
              {msg.content}
            </div>
          ))
        )}
      </div>
      <div className="mt-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? 'Type a message…' : 'Connecting…'}
          disabled={!connected}
          className="w-full border rounded-md px-3 py-2 text-sm disabled:opacity-50"
        />
      </div>
    </div>
  );
}
