"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Player,
  PlayerError,
  PlayerEventType,
  PlayerState,
  TextMetadataCue,
} from "amazon-ivs-player";
import { PlaybackMetadataEvent } from "@/broadcast/service/type";
import { PlaybackMetadataEventType } from "@/broadcast/service/enum";

// --- retry tuning ---
const START_BACKOFF = 800;     // ms
const MAX_BACKOFF = 8000;      // ms
const JITTER = 0.25;           // +/-25%

type Props = {
  /** IVS playback URL (master.m3u8) */
  src: string;
  /** Optional poster (ensure it exists in /public or omit) */
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  showStats?: boolean;
  ariaLabel?: string;
};

export default function IVSPlayer({
  src,
  autoPlay = true,
  muted = false,
  showStats = true,
  ariaLabel = "IVS player",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef<number>(START_BACKOFF);
  const disposedRef = useRef<boolean>(false);

  const [stats, setStats] = useState<{
    latency?: number;
    bitrate?: number;
    resolution?: string;
    state?: string;
  }>({});

  // helpers
  const jitter = (ms: number) => {
    const d = ms * JITTER;
    return Math.round(ms + (Math.random() * 2 - 1) * d);
  };

  const clearRetry = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const scheduleRetry = () => {
    if (disposedRef.current) return;
    if (retryTimerRef.current) return;

    const delay = jitter(backoffRef.current);
    // escalate backoff for next time
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);

    retryTimerRef.current = setTimeout(async () => {
      retryTimerRef.current = null;
      if (disposedRef.current || !playerRef.current) return;

      // Only reload when the playlist is actually available
      try {
        playerRef.current.load(src);
        if (autoPlay && videoRef.current) {
          await videoRef.current.play().catch(() => { });
        }
        // if load succeeded, reset backoff
        backoffRef.current = START_BACKOFF;
      } catch {
        // schedule another try
        scheduleRetry();
      }
    }, delay);
  };

  useEffect(() => {
    disposedRef.current = false;

    async function setup() {
      if (!videoRef.current) return;
      // dynamic import to avoid SSR issues
      const ivs = await import("amazon-ivs-player");
      if (disposedRef.current) return;

      // NOTE: call the function, don't just check existence
      if (!ivs.isPlayerSupported) {
        console.warn("IVS Player not supported; you could fall back to hls.js here.");
        return;
      }

      const player = ivs.create({
        wasmWorker: "/ivs/amazon-ivs-wasmworker.min.js",
        wasmBinary: "/ivs/amazon-ivs-wasmworker.min.wasm",
      });
      playerRef.current = player;

      player.attachHTMLVideoElement(videoRef.current);

      // Player config
      player.setAutoplay(autoPlay);
      player.setMuted(muted);
      player.setAutoQualityMode(true);
      player.setLiveLowLatencyEnabled(true);
      player.setRebufferToLive(true);

      // Load initial src (may 404 briefly while IVS warms up)
      try {
        player.load(src);
      } catch {
        // if load throws synchronously, start retry loop
        scheduleRetry();
      }

      // Stats
      const updateStats = () => {
        try {
          setStats({
            latency: player.getLiveLatency(),
            bitrate: Math.round(player.getQuality()?.bitrate / 1000) || undefined,
            resolution: `${player.getDisplayWidth()}x${player.getDisplayHeight()}`,
            state: player.getState(),
          });
        } catch { }
      };

      // On READY: pick best quality (workaround for controls quirk)
      const onReady = () => {
        updateStats();
        try {
          const v = videoRef.current!;
          const keep = v.controls;
          v.controls = false;
          const qs = player.getQualities();
          const best = qs.sort((a, b) => b.bitrate - a.bitrate)[0];
          if (best) player.setQuality(best);
          v.controls = keep;
        } catch { }
      };

      const onPlaying = () => {
        updateStats();
        // healthy → reset backoff
        backoffRef.current = START_BACKOFF;
      };

      const onBuffering = updateStats;
      const onIdle = updateStats;
      const onEnded = updateStats;

      const onError = (e: PlayerError) => {
        if ((e)?.code === 404 && (e)?.source === "MasterPlaylist") {
          scheduleRetry();
        }
      };

      const onMeta = (payload: TextMetadataCue) => {
        try {
          const event = JSON.parse(payload.text) as PlaybackMetadataEvent
          switch(event.type) {
            case PlaybackMetadataEventType.OFFER:
              break;
            case PlaybackMetadataEventType.SESSION:
              break
          }
          console.log(event)

        } catch(e) {
          console.log(e)
        }
      };

      player.addEventListener(PlayerState.READY, onReady);
      player.addEventListener(PlayerState.PLAYING, onPlaying);
      player.addEventListener(PlayerState.BUFFERING, onBuffering);
      player.addEventListener(PlayerState.IDLE, onIdle);
      player.addEventListener(PlayerState.ENDED, onEnded);
      player.addEventListener(PlayerEventType.ERROR, onError);
      player.addEventListener(PlayerEventType.TEXT_METADATA_CUE, onMeta);

      // Try to start playback if allowed
      if (autoPlay && videoRef.current) {
        try {
          await videoRef.current.play();
        } catch {
          // autoplay blocked — user can tap play
        }
      }

      // Network + visibility resilience
      const onOnline = () => {
        clearRetry();
        backoffRef.current = START_BACKOFF;
        scheduleRetry();
      };
      const onVisible = () => {
        if (document.visibilityState === "visible") {
          clearRetry();
          backoffRef.current = START_BACKOFF;
          scheduleRetry();
        }
      };
      window.addEventListener("online", onOnline);
      document.addEventListener("visibilitychange", onVisible);

      // cleanup
      return () => {
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onVisible);
      };
    }

    setup();

    return () => {
      disposedRef.current = true;
      clearRetry();
      try {
        playerRef.current?.pause();
        playerRef.current?.delete();
      } catch { }
      playerRef.current = null;
    };
  }, [src, autoPlay, muted]);

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl border bg-black shadow-sm">
        <div className="aspect-video">
          <video
            ref={videoRef}
            // poster={poster}               // ensure /public/poster.jpg exists, otherwise remove
            playsInline
            controls
            muted={muted}
            preload="auto"
            aria-label={ariaLabel}
            className="h-full w-full object-contain"
          />
        </div>

        {showStats && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <div>State: {stats.state ?? "…"}</div>
            <div>
              Latency: {typeof stats.latency === "number" ? `${stats.latency.toFixed(1)}s` : "…"}
            </div>
            <div>Bitrate: {stats.bitrate ? `${stats.bitrate} kbps` : "…"}</div>
            <div>Res: {stats.resolution ?? "…"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
