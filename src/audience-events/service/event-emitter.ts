"use client";

import { ChatEvent } from "amazon-ivs-chat-messaging";

const audienceEventEmitter = new EventTarget();

const AUDIENCE_EVENTS = {
  CHAT_EVENT: "audience:chat-event",
} as const;

export function emitAudienceChatEvent(detail: ChatEvent) {
  audienceEventEmitter.dispatchEvent(
    new CustomEvent(AUDIENCE_EVENTS.CHAT_EVENT, { detail }),
  );
}

export function onAudienceChatEvent(handler: (event: ChatEvent) => void) {
  const listener = (event: Event) =>
    handler((event as CustomEvent<ChatEvent>).detail);
  audienceEventEmitter.addEventListener(AUDIENCE_EVENTS.CHAT_EVENT, listener);
  return () =>
    audienceEventEmitter.removeEventListener(AUDIENCE_EVENTS.CHAT_EVENT, listener);
}
