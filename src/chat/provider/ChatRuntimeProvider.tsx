'use client';

import { ChatRuntimeContext } from "../context/ChatRuntimeContext";

type ChatRuntimeProviderProps = {
  sessionId: string;
  attendanceId: string;
  currentUserRole: "host" | "presenter" | "attendee";
  enabled: boolean;
  children: React.ReactNode;
};

export function ChatRuntimeProvider({
  sessionId,
  attendanceId,
  currentUserRole,
  enabled,
  children,
}: ChatRuntimeProviderProps) {
  return (
    <ChatRuntimeContext.Provider
      value={{ sessionId, attendanceId, currentUserRole, enabled }}
    >
      {children}
    </ChatRuntimeContext.Provider>
  );
}
