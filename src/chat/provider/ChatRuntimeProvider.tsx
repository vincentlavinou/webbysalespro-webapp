'use client';

import { ChatRuntimeContext } from "../context/ChatRuntimeContext";

type ChatRuntimeProviderProps = {
  sessionId: string;
  registrantId: string;
  currentUserRole: "host" | "presenter" | "attendee";
  enabled: boolean;
  children: React.ReactNode;
};

export function ChatRuntimeProvider({
  sessionId,
  registrantId,
  currentUserRole,
  enabled,
  children,
}: ChatRuntimeProviderProps) {
  return (
    <ChatRuntimeContext.Provider
      value={{ sessionId, registrantId, currentUserRole, enabled }}
    >
      {children}
    </ChatRuntimeContext.Provider>
  );
}
