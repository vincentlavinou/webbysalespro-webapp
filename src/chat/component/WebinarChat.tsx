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
  currentUserRole?: "host" | "presenter" | "attendee";
  /** Optional render slot to fully control the chat layout inside providers */
  render?: () => ReactNode;
}

export function WebinarChat({ region, currentUserRole = "attendee", render }: WebinarChatProps) {
  const { sessionId, getRequestHeaders } = useBroadcastConfiguration();

  // Refs so the stable tokenProvider always has the latest values when IVS calls
  // it for a fresh token — without changing the function reference on every render.
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const getRequestHeadersRef = useRef(getRequestHeaders);
  getRequestHeadersRef.current = getRequestHeaders;

  // Stable reference across all re-renders. Token is read server-side from the
  // cookie by the server action — no client-side token needed here.
  const stableTokenProvider = useRef(async (): Promise<ChatToken> => {
    const response = await tokenProvider(
      sessionIdRef.current,
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
    getLatestChatConfig({ sessionId })
  }, [sessionId, getLatestChatConfig])

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
          initialChatConfig={initialChatConfig}
          currentUserRole={currentUserRole}
        >
          {render ? render() : <ChatPanel />}
        </ChatProvider>
      </ChatControlProvider>
    </ChatConfigurationProvider>
  );
}
