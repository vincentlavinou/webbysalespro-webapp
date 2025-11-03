// ChatInput.tsx
'use client';
import { useRef, useState } from "react";
import { useChat } from "../hooks";
import { useChatControl } from "../hooks/use-chat-control";
import { Send } from "lucide-react";

export function ChatInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const { recipient } = useChatControl();
  const { connected, sendMessage } = useChat();

  const handleSend = () => {
    const content = inputValue.trim();
    if (content) {
      sendMessage(content, recipient);
      setInputValue('');
      // Keep keyboard open for fast follow-ups
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mt-2 flex gap-1">
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={connected ? 'Type a message…' : 'Connecting…'}
        disabled={!connected}
        inputMode="text"
        enterKeyHint="send"
        autoComplete="off"
        autoCorrect="on"
        className="w-full h-10 border rounded-md px-3 text-base disabled:opacity-50"
        aria-label="Chat message"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!connected || !inputValue.trim()}
        className="h-10 px-3 rounded-md border text-foreground disabled:opacity-50 inline-flex items-center justify-center"
        aria-label="Send message"
        title="Send"
      >
        <Send className="size-4" />
      </button>
    </div>
  );
}
