'use client';

import { useContext } from "react";
import { ChatRuntimeContext } from "../context/ChatRuntimeContext";

export function useChatRuntime() {
  const ctx = useContext(ChatRuntimeContext);
  if (!ctx) {
    throw new Error("useChatRuntime is not being used inside ChatRuntimeProvider");
  }
  return ctx;
}
