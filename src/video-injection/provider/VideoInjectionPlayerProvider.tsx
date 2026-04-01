"use client";

import { useEffect, useState } from "react";
import { VideoInjectionPlayerContext } from "../context/VideoInjectionPlayerContext";
import { getVideoInjectionState } from "../service/action";

interface VideoInjectionPlayerProviderProps {
  children: React.ReactNode;
  sessionId: string;
}

export function VideoInjectionPlayerProvider({
  children,
  sessionId,
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
      const state = await getVideoInjectionState(sessionId);
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
  }, [sessionId]);

  // Re-hydrate when the attendee manually refreshes the stream
  useEffect(() => {
    const handleStreamRefresh = async () => {
      const state = await getVideoInjectionState(sessionId);
      if (state.active) {
        setIsActive(true);
        setPlaybackUrl(state.playback_url ?? null);
        setTitle(state.title ?? null);
        setDurationMs(state.duration_ms ?? null);
        setElapsedSeconds(state.elapsed_seconds ?? 0);
        setVideoInjectionId(state.video_injection_id ?? null);
      } else {
        setIsActive(false);
        setPlaybackUrl(null);
        setTitle(null);
        setDurationMs(null);
        setElapsedSeconds(null);
        setVideoInjectionId(null);
      }
    };
    window.addEventListener("webinar:stream:refresh", handleStreamRefresh);
    return () => window.removeEventListener("webinar:stream:refresh", handleStreamRefresh);
  }, [sessionId]);

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
