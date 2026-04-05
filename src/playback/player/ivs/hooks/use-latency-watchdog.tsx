// components/ivs/hooks/use-latency-watchdog.ts
"use client";

import { useEffect, useRef } from "react";
import type { Player } from "amazon-ivs-player";
import { PlayerState } from "amazon-ivs-player";

// Less aggressive defaults to avoid reload/rebuffer loops after tab switches.
const LATENCY_SEEK_THRESHOLD = 8;
const LATENCY_RELOAD_THRESHOLD = 20;
const LATENCY_POLL_MS = 5000;
const BUFFERING_TIMEOUT_MS = 8000;
const RELOAD_COOLDOWN_MS = 30000;

export function useLatencyWatchdog(
  playerRef: React.RefObject<Player | null>,
  src: string,
  playerVersion: number
) {
  const latencyPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReloadRef = useRef<number>(0);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return; // playerVersion guarantees p is set, but guard defensively

    const seekToLive = () => {
      try {
        const dur = p.getDuration();
        if (isFinite(dur) && dur > 0) p.seekTo(dur);
      } catch {}
    };

    const clearBufferingTimer = () => {
      if (bufferingTimerRef.current) {
        clearTimeout(bufferingTimerRef.current);
        bufferingTimerRef.current = null;
      }
    };

    const clearLatencyPoll = () => {
      if (latencyPollRef.current) {
        clearInterval(latencyPollRef.current);
        latencyPollRef.current = null;
      }
    };

    const reloadToLive = () => {
      const now = Date.now();
      if (now - lastReloadRef.current < RELOAD_COOLDOWN_MS) return;
      lastReloadRef.current = now;
      p.load(src);
    };

    // Poll latency while playing
    latencyPollRef.current = setInterval(() => {
      const p2 = playerRef.current;
      if (!p2) return;
      if (p2.getState() !== PlayerState.PLAYING) return;

      const latency = p2.getLiveLatency();
      if (typeof latency !== "number") return;

      if (latency >= LATENCY_RELOAD_THRESHOLD) reloadToLive();
      else if (latency >= LATENCY_SEEK_THRESHOLD) seekToLive();
    }, LATENCY_POLL_MS);

    // Buffering timeout recovery
    const onBuffering = () => {
      clearBufferingTimer();
      bufferingTimerRef.current = setTimeout(() => {
        const p2 = playerRef.current;
        if (!p2) return;
        if (p2.getState() !== PlayerState.BUFFERING) return;
        const latency = p2.getLiveLatency();
        if (typeof latency === "number" && latency >= LATENCY_RELOAD_THRESHOLD) {
          reloadToLive();
        } else {
          seekToLive();
        }
      }, BUFFERING_TIMEOUT_MS);
    };

    const onPlayingOrIdle = () => clearBufferingTimer();

    p.addEventListener(PlayerState.BUFFERING, onBuffering);
    p.addEventListener(PlayerState.PLAYING, onPlayingOrIdle);
    p.addEventListener(PlayerState.IDLE, onPlayingOrIdle);

    return () => {
      clearBufferingTimer();
      clearLatencyPoll();
      try {
        p.removeEventListener(PlayerState.BUFFERING, onBuffering);
        p.removeEventListener(PlayerState.PLAYING, onPlayingOrIdle);
        p.removeEventListener(PlayerState.IDLE, onPlayingOrIdle);
      } catch {}
    };
  }, [playerRef, src, playerVersion]);
}
