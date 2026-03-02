// ChatInput.tsx
'use client';

import { useRef, useState } from "react";
import { useChat } from "../hooks";
import { useChatControl } from "../hooks/use-chat-control";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  isLocked?: boolean;
  isDisabled?: boolean;
}

export function ChatInput({ isLocked = false, isDisabled = false }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const { recipient } = useChatControl();
  const { connected, sendMessage } = useChat();

  if (isDisabled) {
    return (
      <div className="mt-2 flex items-center justify-center rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
        Chat is currently unavailable
      </div>
    );
  }

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

  const disabled = isDisabled || !connected || !inputValue.trim();

  return (
    <div className="mt-2 flex gap-2 items-center">
      <Input
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
        className="h-12 rounded-lg border-neutral-300 bg-white px-3 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus-visible:border-[#25D366] focus-visible:ring-[#25D366]/30 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus-visible:border-[#25D366] md:text-base"
      />

      <Button
        type="button"
        onClick={handleSend}
        disabled={disabled}
        aria-label="Send message"
        title="Send"
        className="h-12 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-[#1fa653] disabled:hover:bg-[#25D366]"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}
