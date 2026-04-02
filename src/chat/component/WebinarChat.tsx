// WebinarChat.tsx
'use client';

import { ReactNode, useEffect, useRef, useState } from "react";
import { ChatToken } from "amazon-ivs-chat-messaging";
import { ChatConfigurationProvider } from "../provider/ChatConfigurationProvider";
import { getAttendeeChatSession, getChatTokenAction } from "../service/action";
import { useBroadcastConfiguration } from "@/broadcast/hooks";
import { ChatControlProvider } from "../provider/ChatControlProvider";
import { defaultRecipient } from "../service/utils";
import { DefaultChatRecipient } from "../service/enum";
import { ChatProvider } from "../provider/ChatProvider";
import { ChatPanel } from "./ChatPanel";
import { ChatConfigUpdate } from "../service/type";
import { useAction } from "next-safe-action/hooks";
import { notifyErrorUiMessage } from "@/lib/notify";
import { useAttendeeSession } from "@/attendee-session/hooks/use-attendee-session";

export interface WebinarChatProps {
  region: string;
  currentUserRole?: "host" | "presenter" | "attendee";
  /** Optional render slot to fully control the chat layout inside providers */
  render?: () => ReactNode;
}

// Auth error codes from the API that warrant a session token refresh before retrying.
const AUTH_ERROR_CODES = new Set(['ATD-001', 'unauthorized']);

export function WebinarChat({ region, currentUserRole = "attendee", render }: WebinarChatProps) {
  const { sessionId } = useBroadcastConfiguration();
  const { refresh: refreshSession } = useAttendeeSession();

  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const refreshSessionRef = useRef(refreshSession);
  refreshSessionRef.current = refreshSession;

  // Stable reference across all re-renders.
  // Uses safe-action so API errors are returned as data — never thrown server-side.
  // On auth errors, refreshes the join session token and retries once.
  // Any rejection here is caught by the IVS SDK internally — React never sees it.
  const stableTokenProvider = useRef(async (): Promise<ChatToken> => {
    const fetchToken = () => getChatTokenAction({ sessionId: sessionIdRef.current });

    let result = await fetchToken();

    if (result?.serverError && AUTH_ERROR_CODES.has(result.serverError.code)) {
      await refreshSessionRef.current();
      result = await fetchToken();
    }

    if (!result?.data) {
      const reason = result?.serverError?.detail ?? 'Failed to get chat token';
      const code = result?.serverError?.code ?? 'unknown';
      // Log so this appears in Netlify function logs. Rejection is caught by the
      // IVS SDK internally — it emits a disconnect event, React never sees it.
      console.error(`[chat] token fetch failed (${code}): ${reason}`);
      throw new Error(reason);
    }

    return {
      token: result.data.chat.token,
      sessionExpirationTime: result.data.chat.session_expiration_time,
      tokenExpirationTime: result.data.chat.token_expiration_time,
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
