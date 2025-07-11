import { ChatToken } from "amazon-ivs-chat-messaging";
import { ChatConfigurationContext } from "../context/ChatConfigurationContext"


interface ChatConfigurationProviderProps {
    region: string;
    tokenProvider: () => Promise<ChatToken>;
    children: React.ReactNode
}

export function ChatConfigurationProvider({region, tokenProvider, children}: ChatConfigurationProviderProps) {

    return <ChatConfigurationContext.Provider value={{
        region,
        tokenProvider
    }}>
        {children}
    </ChatConfigurationContext.Provider>
}
