// WebinarChat.tsx
'use client';

import { ReactNode, useEffect, useRef, useState } from "react";
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

  // Refs so the stable tokenProvider always has the latest values when IVS calls
  // it for a fresh token — without changing the function reference on every render.
  // Mobile Safari fires visualViewport resize on every keyboard open/close, which
  // causes parent re-renders. A changing tokenProvider reference would recreate
  // the ChatRoom and trigger a disconnect/reconnect loop on every keystroke.
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const activeTokenRef = useRef(activeToken);
  activeTokenRef.current = activeToken;
  const getRequestHeadersRef = useRef(getRequestHeaders);
  getRequestHeadersRef.current = getRequestHeaders;

  // Created once. Stable reference across all re-renders.
  const stableTokenProvider = useRef(async (): Promise<ChatToken> => {
    const response = await tokenProvider(
      sessionIdRef.current,
      activeTokenRef.current,
      getRequestHeadersRef.current,
    );
    return {
      token: response.chat.token,
      sessionExpirationTime: response.chat.session_expiration_time,
      tokenExpirationTime: response.chat.token_expiration_time,
    } as ChatToken;
  });

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
      tokenProvider={stableTokenProvider.current}
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
