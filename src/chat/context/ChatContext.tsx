import { ChatEvent, ChatMessage } from "amazon-ivs-chat-messaging"
import { ChatConfigUpdate, ChatRecipient } from "../service/type"
import type { SendResult } from "@lavinou/webbysalespro/chat"
import { createContext } from "react"


export type ChatContextType = {
    connected: boolean
    connectionStatus: "idle" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error"
    reconnectAttempt: number
    reconnectDelayMs: number | null
    reconnectNow: () => void
    messages: ChatMessage[]
    filteredMessages: ChatMessage[]
    events: ChatEvent[]
    chatConfig: ChatConfigUpdate | null
    /**
     * Returns why a send was refused rather than swallowing it. The composer
     * used to call this and clear the box in the next statement without
     * looking, so a message moderation held back vanished with no reason —
     * which reads as "chat ate my link".
     */
    sendMessage: (content: string, recipient: ChatRecipient) => Promise<SendResult>
    connect: () => Promise<() => void>
    disconnect: () => void
}

export const ChatContext = createContext<ChatContextType>({
    connected: false,
    connectionStatus: "idle",
    reconnectAttempt: 0,
    reconnectDelayMs: null,
    reconnectNow: () => {},
    messages: [],
    filteredMessages: [],
    events: [],
    chatConfig: null,
    sendMessage: async () => ({ ok: false, reason: "Chat is not ready." }),
    connect: async () => () => {},
    disconnect: () => {}
})
