// WebinarChat.tsx
import { ReactNode } from "react";
import { ChatToken } from "amazon-ivs-chat-messaging";
import { ChatConfigurationProvider } from "../provider/ChatConfigurationProvider";
import { tokenProvider } from "../service/action";
import { useBroadcastConfiguration } from "@/broadcast/hooks";
import { ChatControlProvider } from "../provider/ChatControlProvider";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { ChatProvider } from "../provider/ChatProvider";
import { ChatPanel } from "./ChatPanel";

export interface WebinarChatProps {
  region: string;
  token?: string;
  /** Optional render slot to fully control the chat layout inside providers */
  render?: () => ReactNode;
}

export function WebinarChat({ token, region, render }: WebinarChatProps) {
  const { sessionId, getRequestHeaders, accessToken } = useBroadcastConfiguration();

  return (
    <ChatConfigurationProvider
      region={region}
      tokenProvider={async () => {
        const response = await tokenProvider(sessionId, accessToken, getRequestHeaders);
        return {
          token: response.chat.token,
          sessionExpirationTime: response.chat.session_expiration_time,
          tokenExpirationTime: response.chat.token_expiration_time,
        } as ChatToken;
      }}
    >
      <ChatControlProvider
        options={[
          defaultRecipient(DefaultChatRecipient.EVERYONE),
          defaultRecipient(DefaultChatRecipient.HOST),
        ]}
      >
        <ChatProvider token={token}>
          {render ? render() : <ChatPanel />}
        </ChatProvider>
      </ChatControlProvider>
    </ChatConfigurationProvider>
  );
}
