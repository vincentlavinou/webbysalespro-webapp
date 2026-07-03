'use client';

import { createContext } from "react";

export type ChatRuntimeContextType = {
  sessionId: string;
  registrantId: string;
  currentUserRole: "host" | "presenter" | "attendee";
  enabled: boolean;
  /** Anonymous guest session — chat is read-only until they claim an identity. */
  requiresRegistration: boolean;
  /** Clears the guest flag optimistically after a successful claim. */
  onRegistered: () => void;
};

export const ChatRuntimeContext = createContext<ChatRuntimeContextType>({
  sessionId: "",
  registrantId: "",
  currentUserRole: "attendee",
  enabled: false,
  requiresRegistration: false,
  onRegistered: () => {},
});
