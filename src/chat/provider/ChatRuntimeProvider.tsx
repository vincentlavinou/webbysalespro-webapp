'use client';

import type { ChatServiceRole } from "@lavinou/webbysalespro/chat";
import { ChatRuntimeContext } from "../context/ChatRuntimeContext";

type ChatRuntimeProviderProps = {
  sessionId: string;
  registrantId: string;
  currentUserRole: ChatServiceRole;
  enabled: boolean;
  requiresRegistration: boolean;
  onRegistered: () => void;
  children: React.ReactNode;
};

export function ChatRuntimeProvider({
  sessionId,
  registrantId,
  currentUserRole,
  enabled,
  requiresRegistration,
  onRegistered,
  children,
}: ChatRuntimeProviderProps) {
  return (
    <ChatRuntimeContext.Provider
      value={{
        sessionId,
        registrantId,
        currentUserRole,
        enabled,
        requiresRegistration,
        onRegistered,
      }}
    >
      {children}
    </ChatRuntimeContext.Provider>
  );
}
