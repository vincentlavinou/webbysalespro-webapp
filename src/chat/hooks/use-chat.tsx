import { useContext } from 'react';
import { ChatContext } from '../context/ChatContext';

export function useChat() {
    const ctx = useContext(ChatContext)
    if(!ctx) throw new Error("useChat is not used inside a ChatProvider")
    return ctx
}
