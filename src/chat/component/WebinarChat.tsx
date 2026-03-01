// WebinarChat.tsx
'use client';

import { ReactNode, useEffect, useState } from "react";
import { ChatToken } from "amazon-ivs-chat-messaging";
import { ChatConfigurationProvider } from "../provider/ChatConfigurationProvider";
import { getAttendeeChatSession, tokenProvider } from "../service/action";
import { useBroadcastConfiguration } from "@/broadcast/hooks";
import { ChatControlProvider } from "../provider/ChatControlProvider";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { ChatProvider } from "../provider/ChatProvider";
import { ChatPanel } from "./ChatPanel";
import { ChatConfigUpdate } from "../service/type";
import { useAction } from "next-safe-action/hooks";
import { notifyErrorUiMessage } from "@/lib/notify";

export interface WebinarChatProps {
  region: string;
  token?: string;
  currentUserRole?: "host" | "presenter" | "attendee";
  /** Optional render slot to fully control the chat layout inside providers */
  render?: () => ReactNode;
}

export function WebinarChat({ token, region, currentUserRole = "attendee", render }: WebinarChatProps) {
  const { sessionId, getRequestHeaders, accessToken } = useBroadcastConfiguration();
  const activeToken = token || accessToken;

  const [initialChatConfig, setInitialChatConfig] = useState<ChatConfigUpdate | null>(null);

  const {execute: getLatestChatConfig} = useAction(getAttendeeChatSession, {
    onSuccess({data}) {
      setInitialChatConfig(data)
    },
    onError({ error: { serverError } }) {
      notifyErrorUiMessage(serverError, "Failed to load chat settings. Please try again.");
    }
  })

  useEffect(() => {

    if(!activeToken) return

    getLatestChatConfig({
      sessionId: sessionId,
      token: activeToken
    })
    
  },[sessionId, activeToken, getLatestChatConfig])

  return (
    <ChatConfigurationProvider
      region={region}
      tokenProvider={async () => {
        const response = await tokenProvider(sessionId, activeToken, getRequestHeaders);
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
        <ChatProvider
          token={activeToken}
          initialChatConfig={initialChatConfig}
          currentUserRole={currentUserRole}
        >
          {render ? render() : <ChatPanel />}
        </ChatProvider>
      </ChatControlProvider>
    </ChatConfigurationProvider>
  );
}
