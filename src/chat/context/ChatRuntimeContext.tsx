'use client';

import { createContext } from "react";
import type { ChatServiceRole } from "@lavinou/webbysalespro/chat";

export type ChatRuntimeContextType = {
  sessionId: string;
  registrantId: string;
  /**
   * The seat this viewer holds.
   *
   * Was `"host" | "presenter" | "attendee"`, which could not express `cohost`
   * or `spectator` — both of which the broadcast token has been returning all
   * along. A co-host therefore fell through every role check in here.
   */
  currentUserRole: ChatServiceRole;
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
