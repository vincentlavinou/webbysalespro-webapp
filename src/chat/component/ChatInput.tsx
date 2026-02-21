// ChatInput.tsx
'use client';

import { useRef, useState } from "react";
import { useChat } from "../hooks";
import { useChatControl } from "../hooks/use-chat-control";
import { Send } from "lucide-react";

interface ChatInputProps {
  isLocked?: boolean;
}

export function ChatInput({ isLocked = false }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const { recipient } = useChatControl();
  const { connected, sendMessage } = useChat();

  if (isLocked) {
    return (
      <div className="mt-2 flex items-center justify-center rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
        Chat is read-only
      </div>
    );
  }

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || !connected) return;

    sendMessage(content, recipient);
    setInputValue('');
    // Keep keyboard open for fast follow-ups
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const disabled = !connected || !inputValue.trim();

  return (
    <div className="mt-2 flex gap-2 items-center">
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
        aria-label="Chat message"
        className={[
          "text-base", 
          "w-full rounded-lg border px-3 py-3 outline-none transition-colors",
          // light mode
          "bg-white text-neutral-900 border-neutral-300 placeholder:text-neutral-400",
          "focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]",
          // dark mode
          "dark:bg-neutral-800 dark:text-neutral-50 dark:border-neutral-700 dark:placeholder:text-neutral-500",
          "dark:focus:border-[#25D366] dark:focus:ring-[#25D366]",
          // disabled state
          "!disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed",
          "dark:disabled:bg-neutral-900 dark:disabled:text-neutral-600",
        ].join(" ")}
      />

      <button
        type="button"
        onClick={handleSend}
        disabled={disabled}
        aria-label="Send message"
        title="Send"
        className={[
          "shrink-0 inline-flex items-center justify-center gap-1 rounded-lg px-4 py-3 text-sm font-medium",
          // brand background
          "bg-[#25D366] hover:bg-[#1fa653]",
          // text/icon color (same in light + dark)
          "text-white",
          // disabled
          "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#25D366]",
          // subtle shadow
          "shadow-sm",
        ].join(" ")}
      >
        <Send className="size-4" />
      </button>
    </div>
  );
}
