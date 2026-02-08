"use client";

import { useCallback, useEffect, useState } from "react";
import { VideoInjectionPlayerContext } from "../context/VideoInjectionPlayerContext";
import { getVideoInjectionState } from "../service/action";
import { videoInjectionUpdateMetadataSchema } from "../service/schema";
import { usePlaybackMetadataEvent } from "@/emitter/playback";

interface VideoInjectionPlayerProviderProps {
  children: React.ReactNode;
  sessionId: string;
  token: string;
}

export function VideoInjectionPlayerProvider({
  children,
  sessionId,
  token,
}: VideoInjectionPlayerProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number | null>(null);
  const [videoInjectionId, setVideoInjectionId] = useState<string | null>(null);

  // Hydrate on mount
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const state = await getVideoInjectionState(sessionId, token);
      if (cancelled) return;

      if (state.active) {
        const elapsed = state.elapsed_seconds ?? 0;
        setIsActive(true);
        setPlaybackUrl(state.playback_url ?? null);
        setTitle(state.title ?? null);
        setDurationMs(state.duration_ms ?? null);
        setElapsedSeconds(elapsed);
        setVideoInjectionId(state.video_injection_id ?? null);
      }
    }

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [sessionId, token]);

  const handleMetadataEvent = useCallback(
    (evt: { payload: { action: string; playback_url?: string; title?: string; duration_ms?: number; video_injection_id?: string } }) => {
      const { action, playback_url, title: t, duration_ms, video_injection_id } = evt.payload;

      if (action === "start") {
        setIsActive(true);
        setPlaybackUrl(playback_url ?? null);
        setTitle(t ?? null);
        setDurationMs(duration_ms ?? null);
        setElapsedSeconds(0);
        setVideoInjectionId(video_injection_id ?? null);
      } else if (action === "stop") {
        setIsActive(false);
        setPlaybackUrl(null);
        setTitle(null);
        setDurationMs(null);
        setElapsedSeconds(null);
        setVideoInjectionId(null);
      }
    },
    []
  );

  // Listen for IVS metadata events
  usePlaybackMetadataEvent(
    {
      eventType: "webinar:video-injection:update",
      schema: videoInjectionUpdateMetadataSchema,
      sessionId,
      onEvent: handleMetadataEvent,
      onError: (error) => {
        console.debug(error)
      },
      getSignature: (evt) =>
        `${evt.payload.action}-${evt.payload.video_injection_id ?? ""}`,
    },
    []
  );

  // Listen for natural video end from the player component
  useEffect(() => {
    const handleVideoEnded = () => {
      setIsActive(false);
      setPlaybackUrl(null);
      setTitle(null);
      setDurationMs(null);
      setElapsedSeconds(null);
      setVideoInjectionId(null);
    };

    window.addEventListener("video-injection:ended", handleVideoEnded);
    return () =>
      window.removeEventListener("video-injection:ended", handleVideoEnded);
  }, []);

  return (
    <VideoInjectionPlayerContext.Provider
      value={{
        isActive,
        playbackUrl,
        title,
        durationMs,
        elapsedSeconds,
        videoInjectionId,
      }}
    >
      {children}
    </VideoInjectionPlayerContext.Provider>
  );
}
