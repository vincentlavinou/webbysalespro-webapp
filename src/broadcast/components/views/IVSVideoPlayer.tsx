"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Player,
  PlayerError,
  PlayerEventType,
  PlayerState,
  TextMetadataCue,
} from "amazon-ivs-player";
import { emitPlaybackMetadata, emitPlaybackEnded } from "@/emitter/playback/";

// --- retry tuning ---
const START_BACKOFF = 800; // ms
const MAX_BACKOFF = 8000;  // ms
const JITTER = 0.25;       // +/-25%

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

type StatsState = {
  latency?: number;
  bitrate?: number;
  resolution?: string;
  state?: string;
};

export default function IVSPlayer({
  src,
  poster,
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

  const [stats, setStats] = useState<StatsState>({});
  const [playerState, setPlayerState] = useState<PlayerState | "INIT">("INIT");
  const [autoplayFailed, setAutoplayFailed] = useState(false);

  // --- helpers --------------------------------------------------------------

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
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);

    retryTimerRef.current = setTimeout(async () => {
      retryTimerRef.current = null;
      if (disposedRef.current || !playerRef.current) return;

      try {
        playerRef.current.load(src);
        if (autoPlay && videoRef.current) {
          await videoRef.current.play().catch(() => {
            setAutoplayFailed(true);
          });
        }
        backoffRef.current = START_BACKOFF;
      } catch {
        scheduleRetry();
      }
    }, delay);
  };

  const updateStats = (player: Player) => {
    try {
      const state = player.getState();
      setPlayerState(state);
      setStats({
        latency: player.getLiveLatency(),
        bitrate: Math.round(player.getQuality()?.bitrate / 1000) || undefined,
        resolution: `${player.getDisplayWidth()}x${player.getDisplayHeight()}`,
        state,
      });
    } catch {
      // ignore stats failures
    }
  };

  // manual play for autoplay-blocked devices (iOS low power, etc.)
  const handleManualPlay = async () => {
    if (!videoRef.current) return;

    try {
      clearRetry();
      backoffRef.current = START_BACKOFF;
      await videoRef.current.play();
      setAutoplayFailed(false);
    } catch (err) {
      console.warn("Manual play failed", err);
      setAutoplayFailed(true);
    }
  };

  // --- main effect ----------------------------------------------------------

  useEffect(() => {
    disposedRef.current = false;
    setAutoplayFailed(false); // reset when src/autoPlay/muted changes

    async function setup() {
      if (!videoRef.current) return;

      const ivs = await import("amazon-ivs-player");
      if (disposedRef.current) return;

      if (!ivs.isPlayerSupported) {
        console.warn("IVS Player not supported; consider a fallback.");
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

      // Initial load
      try {
        player.load(src);
      } catch {
        scheduleRetry();
      }

      // --- event handlers ---------------------------------------------------

      const onReady = () => {
        updateStats(player);

        try {
          const v = videoRef.current!;
          const keep = v.controls;
          v.controls = false;

          const qualities = player.getQualities();
          const best = qualities.sort((a, b) => b.bitrate - a.bitrate)[0];
          if (best) player.setQuality(best);

          v.controls = keep;
        } catch {
          // ignore
        }
      };

      const onPlaying = () => {
        backoffRef.current = START_BACKOFF;
        setAutoplayFailed(false); // once playing, clear autoplay failure
        updateStats(player);
      };

      const onBuffering = () => updateStats(player);
      const onIdle = () => updateStats(player);
      const onEnded = () => {
        updateStats(player);
        emitPlaybackEnded();
      };

      const onError = (e: PlayerError) => {
        if (e?.code === 404 && e?.source === "MasterPlaylist") {
          scheduleRetry();
        }
      };

      const onMeta = (payload: TextMetadataCue) => {
        try {
          emitPlaybackMetadata(payload.text)
        } catch (e) {
          console.warn("onMetadataText handler error", e);
        }
      };

      // Hook up listeners
      player.addEventListener(PlayerState.READY, onReady);
      player.addEventListener(PlayerState.PLAYING, onPlaying);
      player.addEventListener(PlayerState.BUFFERING, onBuffering);
      player.addEventListener(PlayerState.IDLE, onIdle);
      player.addEventListener(PlayerState.ENDED, onEnded);
      player.addEventListener(PlayerEventType.ERROR, onError);
      player.addEventListener(PlayerEventType.TEXT_METADATA_CUE, onMeta);

      // Attempt autoplay
      if (autoPlay && videoRef.current) {
        try {
          await videoRef.current.play();
          setAutoplayFailed(false);
        } catch {
          // autoplay blocked; show manual play button
          setAutoplayFailed(true);
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

      // Cleanup for this setup() call
      return () => {
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onVisible);

        player.removeEventListener(PlayerState.READY, onReady);
        player.removeEventListener(PlayerState.PLAYING, onPlaying);
        player.removeEventListener(PlayerState.BUFFERING, onBuffering);
        player.removeEventListener(PlayerState.IDLE, onIdle);
        player.removeEventListener(PlayerState.ENDED, onEnded);
        player.removeEventListener(PlayerEventType.ERROR, onError);
        player.removeEventListener(PlayerEventType.TEXT_METADATA_CUE, onMeta);

        try {
          player.pause();
          player.delete();
        } catch {
          // ignore
        }
      };
    }

    const cleanupPromise = setup();

    return () => {
      disposedRef.current = true;
      clearRetry();
      playerRef.current = null;

      if (cleanupPromise instanceof Promise) {
        cleanupPromise.catch(() => { });
      }
    };
  }, [src, autoPlay, muted]);

  // --- derived UI state -----------------------------------------------------

  const effectiveState =
    playerState !== "INIT" ? playerState : (stats.state as PlayerState | undefined);

  const isPlaying = effectiveState === PlayerState.PLAYING;
  const isEnded = effectiveState === PlayerState.ENDED;

  const isLoading =
    !autoplayFailed &&
    (!effectiveState ||
      effectiveState === PlayerState.IDLE ||
      effectiveState === PlayerState.READY ||
      effectiveState === PlayerState.BUFFERING);

  const shouldBlur = !isPlaying; // blur for everything except actively playing

  // --- render ---------------------------------------------------------------

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl border bg-black shadow-sm">
        <div className="aspect-video">
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            controls
            muted={muted}
            preload="auto"
            aria-label={ariaLabel}
            className={`h-full w-full object-contain transition duration-200 ${shouldBlur ? "blur-sm" : ""}`}
          />
        </div>

        {/* Overlay for loading / ended states */}
        {shouldBlur && (
          <div
            className={`
              absolute inset-0 flex flex-col items-center justify-center gap-3
              bg-black/40 backdrop-blur-sm
              ${isLoading || isEnded ? "pointer-events-none" : "pointer-events-none"}
            `}
          >
            {isLoading && (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                  Connecting to live webinar…
                </p>
              </>
            )}

            {isEnded && !isLoading && (
              <div className="rounded-md bg-black/70 px-3 py-2 text-sm font-medium text-white">
                This live webinar has ended.
              </div>
            )}
          </div>
        )}

        {/* Autoplay blocked overlay (e.g. iOS low power mode) */}
        {autoplayFailed && !isPlaying && !isEnded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <button
              type="button"
              onClick={handleManualPlay}
              className="flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-gray-900 shadow-lg hover:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300">
                {/* simple play icon */}
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-4 w-4 translate-x-[1px]"
                >
                  <polygon points="6,4 20,12 6,20" fill="currentColor" />
                </svg>
              </span>
              <span>Tap to start the live webinar</span>
            </button>
          </div>
        )}

        {/* Debug / live stats */}
        {showStats && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <div>State: {effectiveState ?? "…"}</div>
            <div>
              Latency:{" "}
              {typeof stats.latency === "number"
                ? `${stats.latency.toFixed(1)}s`
                : "…"}
            </div>
            <div>Bitrate: {stats.bitrate ? `${stats.bitrate} kbps` : "…"}</div>
            <div>Res: {stats.resolution ?? "…"}</div>
          </div>
        )}
      </div>
    </div>
  );
}
