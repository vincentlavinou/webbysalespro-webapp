'use client';

import { useEffect, useMemo, useRef, useState } from "react";
import { onPlaybackEnded, onPlaybackPlaying } from "@/emitter/playback";
import {
  PlaybackRuntimeContext,
  PlaybackStatus,
} from "../context/PlaybackRuntimeContext";

const CHAT_ACTIVITY_GRACE_MS = 10000;

type PlaybackRuntimeProviderProps = {
  children: React.ReactNode;
  initialStatus?: PlaybackStatus;
};

const ACTIVE_PLAYBACK_STATUSES = new Set<PlaybackStatus>([
  "ready",
  "playing",
  "buffering",
]);

export function PlaybackRuntimeProvider({
  children,
  initialStatus = "loading",
}: PlaybackRuntimeProviderProps) {
  const [status, setStatus] = useState<PlaybackStatus>(initialStatus);
  const [isChatEnabled, setIsChatEnabled] = useState(false);
  const lastActiveAtRef = useRef<number | null>(null);

  useEffect(() => onPlaybackPlaying(() => setStatus("playing")), []);
  useEffect(() => onPlaybackEnded(() => setStatus("ended")), []);

  useEffect(() => {
    if (ACTIVE_PLAYBACK_STATUSES.has(status)) {
      lastActiveAtRef.current = Date.now();
      setIsChatEnabled(true);
      return;
    }

    if (status === "ended") {
      lastActiveAtRef.current = null;
      setIsChatEnabled(false);
      return;
    }

    const lastActiveAt = lastActiveAtRef.current;
    if (!lastActiveAt) {
      setIsChatEnabled(false);
      return;
    }

    const msRemaining = CHAT_ACTIVITY_GRACE_MS - (Date.now() - lastActiveAt);
    if (msRemaining <= 0) {
      lastActiveAtRef.current = null;
      setIsChatEnabled(false);
      return;
    }

    setIsChatEnabled(true);
    const timeoutId = window.setTimeout(() => {
      lastActiveAtRef.current = null;
      setIsChatEnabled(false);
    }, msRemaining);

    return () => window.clearTimeout(timeoutId);
  }, [status]);

  const value = useMemo(
    () => ({
      status,
      isChatEnabled,
      setStatus,
    }),
    [isChatEnabled, status],
  );

  return (
    <PlaybackRuntimeContext.Provider value={value}>
      {children}
    </PlaybackRuntimeContext.Provider>
  );
}
