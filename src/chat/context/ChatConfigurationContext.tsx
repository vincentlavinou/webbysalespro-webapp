import { ChatToken } from "amazon-ivs-chat-messaging";
import { createContext } from "react"


export type ChatConfigurationContextType = {
    region: string;
    tokenProvider: () => Promise<ChatToken>;
}


export const ChatConfigurationContext = createContext<ChatConfigurationContextType>({
    region: 'us-east-1',
    tokenProvider: async () => {
        return {} as ChatToken
    }
})