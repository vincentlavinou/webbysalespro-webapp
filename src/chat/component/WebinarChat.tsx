import { ChatToken } from "amazon-ivs-chat-messaging";
import { ChatConfigurationProvider } from "../provider/ChatConfigurationProvider";
import { tokenProvider } from "../service/action";
import { useBroadcastConfiguration } from "@/broadcast/hooks";
import { ChatPanel } from "./ChatPanel";
import { ChatControlProvider } from "../provider/ChatControlProvider";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { ChatProvider } from "../provider/ChatProvider";

export interface WebinarChatProps {
  region: string
}

export function WebinarChat({region}: WebinarChatProps) {

    const { sessionId, getRequestHeaders, accessToken } = useBroadcastConfiguration()

    return <ChatConfigurationProvider region={region} tokenProvider={async () => {
        const response = await tokenProvider(sessionId, accessToken, getRequestHeaders)
        return {
            token: response.chat.token,
            sessionExpirationTime: response.chat.session_expiration_time,
            tokenExpirationTime: response.chat.token_expiration_time
        } as ChatToken
    }}>
        <ChatControlProvider options={[
            defaultRecipient(DefaultChatRecipient.EVERYONE),
            defaultRecipient(DefaultChatRecipient.HOST)
        ]}>
            <ChatProvider>
                <ChatPanel />
            </ChatProvider>
        </ChatControlProvider>
    </ChatConfigurationProvider>
}