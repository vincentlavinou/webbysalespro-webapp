import { ChatEvent, ChatMessage } from "amazon-ivs-chat-messaging"
import { ChatRecipient } from "../service/type"
import { createContext } from "react"


export type ChatContextType = {
    connected: boolean
    messages: ChatMessage[]
    filteredMessages: ChatMessage[]
    events: ChatEvent[]
    sendMessage: (content: string, recipient: ChatRecipient) => Promise<void>
    connect: () => Promise<() => void>
    disconnect: () => void
}

export const ChatContext = createContext<ChatContextType>({
    connected: false,
    messages: [],
    filteredMessages: [],
    events: [],
    sendMessage: async () => {},
    connect: async () => () => {},
    disconnect: () => {}
})