import { ChatEvent, ChatMessage } from "amazon-ivs-chat-messaging"
import { ChatConfigUpdate, ChatRecipient } from "../service/type"
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
    sendMessage: (content: string, recipient: ChatRecipient) => Promise<void>
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
    sendMessage: async () => {},
    connect: async () => () => {},
    disconnect: () => {}
})
