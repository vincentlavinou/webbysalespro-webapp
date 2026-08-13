"use client";

import { sessionChannel } from "@lavinou/webbysalespro/realtime";
import { usePusherChannel } from "@lavinou/webbysalespro/realtime/react";

type Props = {
  sessionId: string;
  /** Handles `webinar:session:update` — the attendee's live-transition signal. */
  onSessionUpdate: (payload: unknown) => void;
  /** Re-hydration. Runs on first subscribe and on every reconnect. */
  onSubscribed: () => void;
};

/**
 * Subscribes the session channel.
 *
 * A component rather than a call inside `WebinarProvider` because the hook has
 * to run *beneath* `RealtimePusherProvider`, and the provider is rendered by
 * `WebinarProvider` itself. Renders nothing.
 *
 * `onSubscribed` matters more than it looks: pusher-js re-subscribes
 * transparently after a reconnect, and a socket that dropped may have missed
 * the transition to `in_progress`. Refetching the session on every subscribe is
 * what keeps a backgrounded or briefly disconnected tab from sitting in the
 * waiting room after the webinar has started.
 */
export function SessionChannelBridge({ sessionId, onSessionUpdate, onSubscribed }: Props) {
  usePusherChannel({
    channel: sessionId ? sessionChannel(sessionId) : null,
    eventHandlers: { "webinar:session:update": onSessionUpdate },
    onSubscribed,
  });

  return null;
}
