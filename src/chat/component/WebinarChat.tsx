// WebinarChat.tsx
'use client';

import { ReactNode, useEffect, useState } from "react";
import { ChatToken } from "amazon-ivs-chat-messaging";
import { ChatConfigurationProvider } from "../provider/ChatConfigurationProvider";
import { tokenProvider } from "../service/action";
import { useBroadcastConfiguration } from "@/broadcast/hooks";
import { ChatControlProvider } from "../provider/ChatControlProvider";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { ChatProvider } from "../provider/ChatProvider";
import { ChatPanel } from "./ChatPanel";
import { ChatConfigUpdate } from "../service/type";

export interface WebinarChatProps {
  region: string;
  token?: string;
  /** Optional render slot to fully control the chat layout inside providers */
  render?: () => ReactNode;
}

export function WebinarChat({ token, region, render }: WebinarChatProps) {
  const { sessionId, getRequestHeaders, accessToken } = useBroadcastConfiguration();
  const [initialChatConfig, setInitialChatConfig] = useState<ChatConfigUpdate | null>(null);

  // Eagerly fetch chat config on mount so it's available before IVS connects.
  // Without this, chatConfig stays null until the IVS room calls tokenProvider,
  // which only happens after room.connect() — leaving the attendee out of sync
  // with whatever the host has configured (disabled chat, pinned announcements, etc.)
  useEffect(() => {
    let cancelled = false;
    tokenProvider(sessionId, accessToken, getRequestHeaders).then((response) => {
      if (!cancelled) setInitialChatConfig(response.chat_config);
    });
    return () => { cancelled = true; };
  // sessionId and accessToken are stable for the lifetime of this mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ChatConfigurationProvider
      region={region}
      tokenProvider={async () => {
        // IVS SDK manages its own token lifecycle (initial connect + refresh).
        // We also update chatConfig here so it stays in sync on each token refresh.
        const response = await tokenProvider(sessionId, accessToken, getRequestHeaders);
        setInitialChatConfig(response.chat_config);
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
        <ChatProvider token={token} initialChatConfig={initialChatConfig}>
          {render ? render() : <ChatPanel />}
        </ChatProvider>
      </ChatControlProvider>
    </ChatConfigurationProvider>
  );
}
