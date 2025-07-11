import { createContext } from "react"
import { ChatRecipient } from "../service/type"
import { defaultRecipient } from "../service/utils"
import { DefaultChatRecipient } from "../service/enum"


export type ChatControlContextType = {
    recipient: ChatRecipient
    setChatRecipient: (recipient: ChatRecipient) => void
    options: ChatRecipient[]
}

export const ChatControlContext = createContext<ChatControlContextType>({
    recipient: defaultRecipient(DefaultChatRecipient.EVERYONE),
    setChatRecipient: () => {},
    options: []
})