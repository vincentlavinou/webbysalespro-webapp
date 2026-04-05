'use client';

import { createContext } from "react";

export type ChatRuntimeContextType = {
  sessionId: string;
  registrantId: string;
  currentUserRole: "host" | "presenter" | "attendee";
  enabled: boolean;
};

export const ChatRuntimeContext = createContext<ChatRuntimeContextType>({
  sessionId: "",
  registrantId: "",
  currentUserRole: "attendee",
  enabled: false,
});
