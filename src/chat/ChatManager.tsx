'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ChatToken } from "amazon-ivs-chat-messaging";
import { notifyErrorUiMessage } from "@/lib/notify";
import { ChatConfigurationProvider } from "./provider/ChatConfigurationProvider";
import { ChatControlProvider } from "./provider/ChatControlProvider";
import { ChatProvider } from "./provider/ChatProvider";
import { ChatRuntimeProvider } from "./provider/ChatRuntimeProvider";
import { getAttendeeChatSession, getChatTokenAction } from "./service/action";
import { defaultRecipient } from "./service/utils";
import { DefaultChatRecipient } from "./service/enum";
import { ChatConfigUpdate } from "./service/type";

type ChatManagerProps = {
  sessionId: string;
  registrantId: string;
  region: string;
  currentUserRole?: "host" | "presenter" | "attendee";
  enabled: boolean;
  children: ReactNode;
};

export function ChatManager({
  sessionId,
  registrantId,
  region,
  currentUserRole = "attendee",
  enabled,
  children,
}: ChatManagerProps) {
  const [initialChatConfig, setInitialChatConfig] = useState<ChatConfigUpdate | null>(null);
  const [isRuntimeEnabled, setIsRuntimeEnabled] = useState(false);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  // Deduplicates concurrent calls from the IVS SDK — if a fetch is already in-flight,
  // return the same promise instead of firing a second request to /api/v1/chat/token/.
  const tokenFetchInFlightRef = useRef<Promise<ChatToken> | null>(null);

  const stableTokenProvider = useRef(async (): Promise<ChatToken> => {
    if (tokenFetchInFlightRef.current) return tokenFetchInFlightRef.current;

    const promise = (async (): Promise<ChatToken> => {
      // attendeeFetch inside getChatTokenAction handles the 401/403 refresh+retry,
      // so we only need one call here.
      const result = await getChatTokenAction({ sessionId: sessionIdRef.current });

      if (!result?.data) {
        const reason = result?.serverError?.detail ?? "Failed to get chat token";
        const code = result?.serverError?.code ?? "unknown";
        console.error(`[chat] token fetch failed (${code}): ${reason}`);
        throw new Error(reason);
      }

      return {
        token: result.data.chat.token,
        sessionExpirationTime: result.data.chat.session_expiration_time,
        tokenExpirationTime: result.data.chat.token_expiration_time,
      } as ChatToken;
    })();

    tokenFetchInFlightRef.current = promise;
    promise.finally(() => { tokenFetchInFlightRef.current = null; });

    return promise;
  });

  const syncLatestChatConfig = useCallback(async () => {
    const result = await getAttendeeChatSession({ sessionId });

    if (result?.data) {
      setInitialChatConfig(result.data);
      return true;
    }

    notifyErrorUiMessage(
      result?.serverError?.detail,
      "Failed to load chat settings. Please try again.",
    );
    return false;
  }, [sessionId]);

  useEffect(() => {
    void syncLatestChatConfig();
  }, [syncLatestChatConfig]);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      setIsRuntimeEnabled(false);
      return;
    }

    setIsRuntimeEnabled(false);

    syncLatestChatConfig().then((isSynced) => {
      if (!cancelled && isSynced) {
        setIsRuntimeEnabled(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, syncLatestChatConfig]);

  return (
    <ChatConfigurationProvider region={region} tokenProvider={stableTokenProvider.current}>
      <ChatRuntimeProvider
        sessionId={sessionId}
        registrantId={registrantId}
        currentUserRole={currentUserRole}
        enabled={isRuntimeEnabled}
      >
        <ChatControlProvider
          options={[
            defaultRecipient(DefaultChatRecipient.EVERYONE),
            defaultRecipient(DefaultChatRecipient.HOST),
          ]}
        >
          <ChatProvider initialChatConfig={initialChatConfig}>
            {children}
          </ChatProvider>
        </ChatControlProvider>
      </ChatRuntimeProvider>
    </ChatConfigurationProvider>
  );
}
