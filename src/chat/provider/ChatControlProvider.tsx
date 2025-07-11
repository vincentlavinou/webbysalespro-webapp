import { useState } from "react";
import { ChatRecipient } from "../service/type";
import { ChatControlContext } from "../context/ChatControlContext";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";

export type ChatControlProviderProps = {
    options: ChatRecipient[]
    children: React.ReactNode
}

export function ChatControlProvider({children, options}: ChatControlProviderProps) {

    const [recipient, setRecipient] = useState<ChatRecipient>(defaultRecipient(DefaultChatRecipient.EVERYONE));

    return <ChatControlContext.Provider value={{
        recipient,
        setChatRecipient: setRecipient,
        options
    }}>
        {children}
    </ChatControlContext.Provider>
}