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

// --- latency / live-sync tuning ---
// If the player drifts past these thresholds we act immediately rather than
// waiting for the browser's own rebuffer logic (which iOS often ignores).
const LATENCY_SEEK_THRESHOLD   = 5;    // seconds – seek to live edge
const LATENCY_RELOAD_THRESHOLD = 10;   // seconds – full reload (faster than seeking from far behind)
const LATENCY_POLL_MS          = 3000; // how often to check latency while playing
const BUFFERING_TIMEOUT_MS     = 5000; // ms stuck in BUFFERING before we force a live sync

// WebKit-specific PiP extensions not in standard TypeScript DOM types
interface WebKitVideoElement extends HTMLVideoElement {
  webkitSupportsPresentationMode?: (mode: string) => boolean;
  webkitSetPresentationMode?: (mode: string) => void;
  webkitPresentationMode?: string;
}

// Standard PiP API properties that may be missing from older TS lib typings
interface DocumentWithPiP extends Document {
  pictureInPictureEnabled: boolean;
  pictureInPictureElement: Element | null;
  exitPictureInPicture: () => Promise<void>;
}

type Props = {
  /** IVS playback URL (master.m3u8) */
  src: string;
  /** Optional poster (ensure it exists in /public or omit) */
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  showStats?: boolean;
  ariaLabel?: string;
  /** Webinar title shown on the OS lock screen / notification via Media Session API */
  title?: string;
  /**
   * Artwork shown on the OS lock screen / notification center.
   * Should be the webinar's thumbnail images mapped to MediaImage objects.
   * Falls back to `poster` if not provided.
   */
  artwork?: MediaImage[];
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
  title,
  artwork,
}: Props) {
  const videoRef        = useRef<HTMLVideoElement | null>(null);
  const playerRef       = useRef<Player | null>(null);
  const retryTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latencyPollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef      = useRef<number>(START_BACKOFF);
  const disposedRef     = useRef<boolean>(false);
  // Tracks whether playback has ever started (guards the return banner from
  // showing on the very first page load).
  const hasPlayedRef    = useRef<boolean>(false);

  const [stats, setStats]               = useState<StatsState>({});
  const [playerState, setPlayerState]   = useState<PlayerState | "INIT">("INIT");
  const [autoplayFailed, setAutoplayFailed] = useState(false);
  // Tracks the actual muted state of the video element separately from the
  // `muted` prop so we can start muted for iOS autoplay compat and then
  // attempt to unmute once we have a playing context.
  const [isMuted, setIsMuted] = useState(true);
  // Driven by PiP enter/leave events so the in-app UI suppresses overlays
  // while the stream is healthy inside a PiP window.
  const [isInPiP, setIsInPiP] = useState(false);
  // True briefly after returning to the page, so we can show a "you were
  // still in the live webinar" nudge.
  const [showReturnBanner, setShowReturnBanner] = useState(false);
  const returnBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref counterpart kept in sync with isInPiP so reconnect logic can read
  // PiP state synchronously inside visibilitychange handlers.
  const isPiPRef = useRef(false);

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

  const clearReturnBannerTimer = () => {
    if (returnBannerTimerRef.current) {
      clearTimeout(returnBannerTimerRef.current);
      returnBannerTimerRef.current = null;
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

  // manual play for autoplay-blocked devices (iOS low power mode, etc.)
  const handleManualPlay = async () => {
    if (!videoRef.current || !playerRef.current) return;

    try {
      clearRetry();
      backoffRef.current = START_BACKOFF;
      // Always play muted first — guarantees the call succeeds even if the
      // browser still considers audio blocked at this point.
      videoRef.current.muted = true;
      await videoRef.current.play();
      setAutoplayFailed(false);
      // We are now inside a user-gesture callback. Unmute immediately.
      if (!muted) {
        videoRef.current.muted = false;
        playerRef.current.setMuted(false);
        setIsMuted(false);
      }
    } catch (err) {
      console.warn("Manual play failed", err);
      setAutoplayFailed(true);
    }
  };

  // shown when the stream is playing but still muted (iOS autoplay policy)
  const handleTapToUnmute = () => {
    if (!videoRef.current || !playerRef.current) return;
    try {
      videoRef.current.muted = false;
      playerRef.current.setMuted(false);
      setIsMuted(false);
    } catch {
      // ignore — button stays visible if unmute keeps failing
    }
  };

  // --- restoreToLive --------------------------------------------------------
  // Called when returning from background without an active PiP session.
  // Always does a full reload: getLiveLatency() is unreliable when the player
  // was paused/backgrounded, and reloading is the safest way to reach the
  // live edge from an unknown offset.

  const restoreToLive = async () => {
    if (!playerRef.current || !videoRef.current || disposedRef.current) return;
    clearRetry();
    backoffRef.current = START_BACKOFF;
    playerRef.current.load(src);
    try {
      await videoRef.current.play();
    } catch {
      setAutoplayFailed(true);
    }
  };

  // --- main effect ----------------------------------------------------------

  useEffect(() => {
    disposedRef.current = false;
    hasPlayedRef.current = false;
    setAutoplayFailed(false);
    setIsMuted(true); // always begin muted so iOS allows autoplay
    setIsInPiP(false);
    setShowReturnBanner(false);
    isPiPRef.current = false;

    // Holds the cleanup returned by setup() once the async work finishes.
    let innerCleanup: (() => void) | undefined;

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

      // Always start muted — iOS will not autoplay unmuted streams and
      // setRebufferToLive / low-latency mode have no effect if playback never
      // begins. We unmute as soon as we are inside a user-gesture context.
      player.setAutoplay(autoPlay);
      player.setMuted(true);
      player.setAutoQualityMode(true);
      // Let ABR choose quality on ALL devices. Previously we forced the
      // highest bitrate on READY, which overrode this setting and caused
      // mobile to buffer much more data per segment — a major latency source.
      player.setLiveLowLatencyEnabled(true);
      player.setRebufferToLive(true);

      // Helper: seek the IVS player to the live edge.
      const seekToLive = () => {
        try {
          const dur = player.getDuration();
          if (isFinite(dur) && dur > 0) player.seekTo(dur);
        } catch {
          // ignore
        }
      };

      // Helper: attempt unmute from within a playing / gesture context.
      const tryUnmute = () => {
        if (muted || !videoRef.current) return;
        try {
          player.setMuted(false);
          videoRef.current.muted = false;
          setIsMuted(false);
        } catch {
          // Will show the "Tap to unmute" button instead.
        }
      };

      // Initial load
      try {
        player.load(src);
      } catch {
        scheduleRetry();
      }

      // --- Latency watchdog -------------------------------------------------
      // Poll every LATENCY_POLL_MS while playing. If the player has drifted
      // past our thresholds we either seek or do a full reload.
      // This is the primary workaround for iOS ignoring setRebufferToLive.
      latencyPollRef.current = setInterval(() => {
        if (disposedRef.current || !playerRef.current) return;
        if (playerRef.current.getState() !== PlayerState.PLAYING) return;

        const latency = playerRef.current.getLiveLatency();
        if (typeof latency !== "number") return;

        if (latency >= LATENCY_RELOAD_THRESHOLD) {
          // So far behind that reloading is faster than seeking.
          playerRef.current.load(src);
        } else if (latency >= LATENCY_SEEK_THRESHOLD) {
          seekToLive();
        }
      }, LATENCY_POLL_MS);

      // --- event handlers ---------------------------------------------------

      const onReady = () => {
        updateStats(player);
        // No quality override here — setAutoQualityMode(true) handles it.
        // Forcing the highest bitrate was causing excessive buffering on mobile.
      };

      const onPlaying = () => {
        backoffRef.current = START_BACKOFF;
        clearBufferingTimer();
        setAutoplayFailed(false);
        updateStats(player);
        // Best-effort unmute now that we are in a playing state.
        // On iOS this succeeds if play() was triggered by a user gesture.
        tryUnmute();

        hasPlayedRef.current = true;

        // Media Session API — shows a lock-screen / notification-center card
        // telling the user the live webinar audio is still active when they
        // leave the browser. Supported on iOS Safari 15+ and Android Chrome.
        // Pause is intentionally not registered — pausing a live webinar from
        // the OS controls is not a supported action.
        if ("mediaSession" in navigator) {
          const resolvedArtwork: MediaImage[] = artwork && artwork.length > 0
            ? artwork
            : poster
              ? [{ src: poster, sizes: "512x512", type: "image/jpeg" }]
              : [];

          navigator.mediaSession.metadata = new MediaMetadata({
            title: title || ariaLabel,
            artist: "Live Webinar",
            artwork: resolvedArtwork,
          });
          navigator.mediaSession.playbackState = "playing";
          navigator.mediaSession.setActionHandler("play", () => {
            videoRef.current?.play().catch(() => {});
          });
          // Explicitly clear the pause handler so the OS hides/disables the button.
          navigator.mediaSession.setActionHandler("pause", null);
        }
      };

      const onBuffering = () => {
        updateStats(player);
        // setRebufferToLive does not reliably fire on iOS native HLS.
        // If we stay stuck in BUFFERING too long, seek/reload manually.
        clearBufferingTimer();
        bufferingTimerRef.current = setTimeout(() => {
          if (disposedRef.current || !playerRef.current) return;
          if (playerRef.current.getState() !== PlayerState.BUFFERING) return;
          const latency = playerRef.current.getLiveLatency();
          if (typeof latency === "number" && latency >= LATENCY_RELOAD_THRESHOLD) {
            playerRef.current.load(src);
          } else {
            seekToLive();
          }
        }, BUFFERING_TIMEOUT_MS);
      };

      const onIdle = () => {
        clearBufferingTimer();
        updateStats(player);
      };

      const onEnded = () => {
        clearBufferingTimer();
        updateStats(player);
        emitPlaybackEnded();
      };

      const onError = (e: PlayerError) => {
        clearBufferingTimer();
        if (e?.code === 404 && e?.source === "MasterPlaylist") {
          scheduleRetry();
        }
      };

      const onMeta = (payload: TextMetadataCue) => {
        try {
          emitPlaybackMetadata(payload.text);
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

      // Attempt muted autoplay. This works on iOS without a gesture.
      if (autoPlay && videoRef.current) {
        try {
          await videoRef.current.play();
          setAutoplayFailed(false);
          // If the page already had a prior user interaction (e.g. waiting
          // room tap) the browser may allow unmuting immediately.
          tryUnmute();
        } catch {
          // Fully blocked — show the "Tap to start" overlay.
          setAutoplayFailed(true);
        }
      }

      // --- PiP helpers -------------------------------------------------------

      const enterPiP = async () => {
        const video = videoRef.current as WebKitVideoElement;
        if (!video) return;
        try {
          // Standard API — Chrome 70+, Safari 14+, Firefox (behind flag)
          const doc = document as DocumentWithPiP;
          if (doc.pictureInPictureEnabled && !doc.pictureInPictureElement) {
            await video.requestPictureInPicture();
            return;
          }
          // WebKit API — older iOS Safari
          if (video.webkitSupportsPresentationMode?.('picture-in-picture')) {
            video.webkitSetPresentationMode?.('picture-in-picture');
          }
        } catch {
          // PiP blocked or unsupported — onVisible will reconnect instead
        }
      };

      const exitPiP = () => {
        try {
          const doc = document as DocumentWithPiP;
          if (doc.pictureInPictureElement) {
            doc.exitPictureInPicture().catch(() => {});
          }
          const video = videoRef.current as WebKitVideoElement;
          if (video?.webkitPresentationMode === 'picture-in-picture') {
            video.webkitSetPresentationMode?.('inline');
          }
        } catch { /* ignore */ }
      };

      // --- PiP event listeners on the video element -------------------------

      const video = videoRef.current!;

      const onEnterPiP = () => {
        isPiPRef.current = true;
        setIsInPiP(true);
      };

      const onLeavePiP = () => {
        isPiPRef.current = false;
        setIsInPiP(false);
        // User closed PiP — restore inline playback to the live edge.
        restoreToLive();
      };

      const onWebkitPresentationModeChanged = () => {
        const mode = (video as WebKitVideoElement).webkitPresentationMode;
        const inPiP = mode === 'picture-in-picture';
        isPiPRef.current = inPiP;
        setIsInPiP(inPiP);
        if (mode === 'inline') restoreToLive();
      };

      video.addEventListener('enterpictureinpicture', onEnterPiP);
      video.addEventListener('leavepictureinpicture', onLeavePiP);
      video.addEventListener('webkitpresentationmodechanged', onWebkitPresentationModeChanged);

      // --- Network + visibility resilience ----------------------------------

      const onOnline = () => {
        clearRetry();
        backoffRef.current = START_BACKOFF;
        scheduleRetry();
      };

      const onHidden = () => {
        if (document.visibilityState !== "hidden") return;
        // Attempt PiP so the stream keeps playing in a floating window.
        // If this fails the browser pauses the video; onVisible will reconnect.
        enterPiP();
      };

      const onVisible = () => {
        if (document.visibilityState !== "visible") return;

        // Show a brief banner so the user knows audio was playing while away.
        // Only shown after playback has started at least once (not on first load).
        if (hasPlayedRef.current) {
          setShowReturnBanner(true);
          clearReturnBannerTimer();
          returnBannerTimerRef.current = setTimeout(() => {
            setShowReturnBanner(false);
          }, 4000);
        }

        // If stream is still alive in a PiP window, exit PiP back to inline.
        // The leavepictureinpicture event will call restoreToLive if needed.
        if (isPiPRef.current) {
          exitPiP();
          return;
        }
        restoreToLive();
      };

      window.addEventListener("online", onOnline);
      document.addEventListener("visibilitychange", onHidden);
      document.addEventListener("visibilitychange", onVisible);

      // Return cleanup so the outer effect can call it on unmount.
      return () => {
        window.removeEventListener("online", onOnline);
        document.removeEventListener("visibilitychange", onHidden);
        document.removeEventListener("visibilitychange", onVisible);

        video.removeEventListener('enterpictureinpicture', onEnterPiP);
        video.removeEventListener('leavepictureinpicture', onLeavePiP);
        video.removeEventListener('webkitpresentationmodechanged', onWebkitPresentationModeChanged);

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

    setup()
      .then((cleanup) => {
        // Stash the cleanup so the outer effect can call it.
        if (cleanup) innerCleanup = cleanup;
      })
      .catch(() => {
        // setup failed silently
      });

    return () => {
      disposedRef.current = true;
      clearRetry();
      clearBufferingTimer();
      clearLatencyPoll();
      clearReturnBannerTimer();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "none";
        navigator.mediaSession.setActionHandler("play", null);
      }
      playerRef.current = null;
      // Call the inner cleanup that removes event listeners and deletes the
      // IVS player. If setup() hasn't resolved yet this is a no-op — the
      // disposedRef guard inside setup() prevents further work.
      innerCleanup?.();
    };
  }, [src, autoPlay, muted]);

  // --- derived UI state -----------------------------------------------------

  const effectiveState =
    playerState !== "INIT" ? playerState : (stats.state as PlayerState | undefined);

  const isPlaying = effectiveState === PlayerState.PLAYING;
  const isEnded   = effectiveState === PlayerState.ENDED;

  const isLoading =
    !autoplayFailed &&
    (!effectiveState ||
      effectiveState === PlayerState.IDLE ||
      effectiveState === PlayerState.READY ||
      effectiveState === PlayerState.BUFFERING);

  // While PiP is active the stream is still playing — don't blur or show overlays.
  const shouldBlur = !isPlaying && !isInPiP;

  // Show the unmute nudge when playing but still muted and the caller
  // wants audio (muted prop is false).
  const showUnmuteNudge = isPlaying && isMuted && !muted;

  // --- render ---------------------------------------------------------------

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-xl border bg-black shadow-sm">
        <div className="aspect-video">
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            autoPlay
            muted={isMuted}
            preload="auto"
            aria-label={ariaLabel}
            className={`h-full w-full object-contain transition duration-200 ${shouldBlur ? "blur-sm" : ""}`}
          />
        </div>

        {/* Return banner — briefly shown when the user comes back to the page
            so they know audio was still playing while they were away. */}
        {showReturnBanner && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-emerald-600/90 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm whitespace-nowrap">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/>
              </svg>
              Audio was playing while you were away
            </div>
          </div>
        )}

        {/* Overlay for loading / ended states */}
        {shouldBlur && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm pointer-events-none">
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
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 translate-x-[1px]">
                  <polygon points="6,4 20,12 6,20" fill="currentColor" />
                </svg>
              </span>
              <span>Tap to start the live webinar</span>
            </button>
          </div>
        )}

        {/* Unmute nudge — iOS autoplay only allows muted streams to start
            automatically. Once playing we ask the user to tap to unmute. */}
        {showUnmuteNudge && (
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2">
            <button
              type="button"
              onClick={handleTapToUnmute}
              className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm hover:bg-black/90 focus:outline-none"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.21 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z" />
              </svg>
              Tap to unmute
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
