'use client'
import { useRef, useState } from "react";
import { useChat } from "../hooks";
import { useChatControl } from "../hooks/use-chat-control";
import { Send } from "lucide-react";



export function ChatInput() {

    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState<string>('');
    const {recipient} = useChatControl()
    const { connected, sendMessage } = useChat();

    const handleSend = () => {
    const content = inputValue.trim();
        if (content) {
            sendMessage(content, recipient);
            setInputValue('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    return(
        <div className="mt-2 flex gap-1">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={connected ? 'Type a message…' : 'Connecting…'}
          disabled={!connected}
          className="w-full border rounded-md px-3 py-2 text-base disabled:opacity-50"
        />
        <button
            type="button"
            onClick={handleSend}
            disabled={!connected || !inputValue.trim()}
            className="px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50"
        >
            <Send />
        </button>
      </div>
    )
}