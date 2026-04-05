// WebinarChat.tsx
'use client';

import { ReactNode } from "react";
import { ChatPanel } from "./ChatPanel";
import { ChatManager } from "../ChatManager";

export interface WebinarChatProps {
  sessionId: string;
  registrantId: string;
  region: string;
  currentUserRole?: "host" | "presenter" | "attendee";
  enabled?: boolean;
  /** Optional render slot to fully control the chat layout inside providers */
  render?: () => ReactNode;
}

export function WebinarChat({
  sessionId,
  registrantId,
  region,
  currentUserRole = "attendee",
  enabled = true,
  render,
}: WebinarChatProps) {
  return (
    <ChatManager
      sessionId={sessionId}
      registrantId={registrantId}
      region={region}
      currentUserRole={currentUserRole}
      enabled={enabled}
    >
      {render ? render() : <ChatPanel />}
    </ChatManager>
  );
}
