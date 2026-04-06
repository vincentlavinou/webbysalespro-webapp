"use client";

import { useEffect } from "react";
import { usePlaybackRuntime } from "@/playback/hooks/use-playback-runtime";
import { useWebinar } from "@/webinar/hooks";

const HEARTBEAT_INTERVAL_MS = 10_000;
const PRESENCE_IDLE_TIMEOUT_MS = 30_000;
const ACTIVE_PLAYBACK_STATUSES = new Set([
  "ready",
  "playing",
  "buffering",
]);

export function AttendanceHeartbeat() {
  const { status } = usePlaybackRuntime();
  const { getLastPresenceRelevantEventAt, recordEvent } = useWebinar();

  useEffect(() => {
    if (!ACTIVE_PLAYBACK_STATUSES.has(status)) return;

    const intervalId = window.setInterval(() => {
      const lastPresenceRelevantEventAt = getLastPresenceRelevantEventAt();
      if (!lastPresenceRelevantEventAt) return;

      if (Date.now() - lastPresenceRelevantEventAt < PRESENCE_IDLE_TIMEOUT_MS) {
        return;
      }

      void recordEvent("heartbeat");
    }, HEARTBEAT_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [getLastPresenceRelevantEventAt, recordEvent, status]);

  return null;
}
