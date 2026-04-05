'use client';

import { createContext } from "react";

export type ChatRuntimeContextType = {
  sessionId: string;
  attendanceId: string;
  currentUserRole: "host" | "presenter" | "attendee";
  enabled: boolean;
};

export const ChatRuntimeContext = createContext<ChatRuntimeContextType>({
  sessionId: "",
  attendanceId: "",
  currentUserRole: "attendee",
  enabled: false,
});
