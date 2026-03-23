// components/ivs/IVSPlayer.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { PlayerState } from "amazon-ivs-player";
import { Expand, Minimize2, PictureInPicture2 } from "lucide-react";
import { emitPlaybackMetadata, emitPlaybackEnded, emitPlaybackPlaying } from "@/emitter/playback/";
import { usePlayer } from "./hooks/use-player";
import { useLatencyWatchdog } from "./hooks/use-latency-watchdog";
import { useMediaSession } from "./hooks/use-media-session";
import { useVisibilityResilience } from "./hooks/use-visibility-resilience";
import { useBackgroundAudioPlayback } from "./hooks/use-background-audio-playback";
import { usePiP } from "./hooks/use-pip";

/**
 * Returns true on iOS and macOS Safari — the only environments where the browser
 * suspends the video element when the tab is hidden or the screen is locked.
 * On Chrome/Firefox/Edge the video element keeps its audio track alive, so no
 * fallback is needed.
 */
function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iP(hone|ad|od)/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    (/Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua))
  );
}

type Props = {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  showStats?: boolean;
  ariaLabel?: string;
  title?: string;
  artwork?: MediaImage[];
  /** Option 1: keep audio alive when tab hidden */
  backgroundAudioEnabled?: boolean;
  /** Keep the player muted and alive in the background so timed metadata cues keep firing (e.g. while video injection overlay is active). */
  keepAlive?: boolean;
};

export default function WebbySalesProIVSPlayer({
  src,
  poster,
  autoPlay = false,
  muted = false,
  showStats = false,
  ariaLabel = "WebbySalesPro player",
  title,
  artwork,
  backgroundAudioEnabled = true,
  keepAlive = false,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const autoFullscreenRef = useRef(false);
  const fullscreenTransitionUntilRef = useRef(0);
  const mobileChromeTimerRef = useRef<number | null>(null);
  // Only use the audio-element fallback on Safari/iOS where the video element
  // gets suspended in the background. On other browsers the video keeps playing.
  const audioFallbackEnabled = backgroundAudioEnabled && isSafariBrowser();
  // Kept in sync synchronously by useBackgroundAudioPlayback so shouldPreventPause
  // always reads the correct mode even before React re-renders.
  const bgAudioModeRef = useRef<"video" | "audio">("video");
  const [isTouchViewport, setIsTouchViewport] = useState(false);
  const [showMobileChrome, setShowMobileChrome] = useState(false);

  const ivs = usePlayer({
    src,
    autoPlay,
    mutedProp: muted,
    videoRef,
    onTextMetadata: emitPlaybackMetadata,
    onEnded: emitPlaybackEnded,
    onPlaying: emitPlaybackPlaying,
    keepAlive,
    shouldPreventPause: () => !audioFallbackEnabled || bgAudioModeRef.current !== "audio",
  });

  // Latency + buffering watchdog (playerVersion ensures the effect runs after the async player init)
  useLatencyWatchdog(ivs.playerRef, src, ivs.playerVersion);

  const bgAudio = useBackgroundAudioPlayback(videoRef, {
    enabled: audioFallbackEnabled,
    hlsUrl: src,
    onRestoreVideo: ivs.restoreToLive,
    externalModeRef: bgAudioModeRef,
  });

  // Prime the audio element once the video is playing for the first time.
  // By this point iOS has already unlocked the page for media playback (via the
  // tap-to-play gesture on the video), so audio.play() works without another
  // gesture. Delaying until here avoids loading two HLS streams on the first tap.
  const hasPrimedRef = useRef(false);
  useEffect(() => {
    if (isPlaying && audioFallbackEnabled && !hasPrimedRef.current) {
      hasPrimedRef.current = true;
      void bgAudio.prime();
    }
  }, [isPlaying, audioFallbackEnabled, bgAudio]);

  // Visibility resilience: prefer audio fallback when hidden
  useVisibilityResilience({
    enabled: true,
    hasPlayedRef: ivs.hasPlayedRef,
    shouldIgnoreVisibilityChange: () => Date.now() < fullscreenTransitionUntilRef.current,
    restoreToLive: ivs.restoreToLive,
    onHiddenAudio: audioFallbackEnabled ? () => {
      // toAudio is now synchronous — no void needed, completes before iOS suspends.
      bgAudio.toAudio();
    } : undefined,
    onVisibleAudio: audioFallbackEnabled ? () => {
      void bgAudio.toVideo();
    } : undefined,
  });

  // Lock screen metadata once we’re playing
  const effectiveState =
    ivs.playerState !== "INIT" ? ivs.playerState : (ivs.stats.state as PlayerState | undefined);

  const isPlaying = effectiveState === PlayerState.PLAYING;
  const isEnded = effectiveState === PlayerState.ENDED;
  const showStartGate = ivs.isPlayerReady && ivs.autoplayFailed && !isPlaying && !isEnded;
  const isLoading =
    !showStartGate &&
    (!ivs.isPlayerReady ||
      !effectiveState ||
      effectiveState === PlayerState.IDLE ||
      effectiveState === PlayerState.READY ||
      effectiveState === PlayerState.BUFFERING);

  const shouldBlur = !isPlaying;
  const showUnmuteNudge = isPlaying && ivs.isMuted && !muted;
  const pip = usePiP(videoRef, ivs.restoreToLive);
  const { restoreToLive, setAutoplayFailed } = ivs;

  const clearMobileChromeTimer = useCallback(() => {
    if (mobileChromeTimerRef.current) {
      window.clearTimeout(mobileChromeTimerRef.current);
      mobileChromeTimerRef.current = null;
    }
  }, []);

  const revealMobileChrome = useCallback(() => {
    if (!isTouchViewport) return;

    setShowMobileChrome(true);
    clearMobileChromeTimer();
    mobileChromeTimerRef.current = window.setTimeout(() => {
      setShowMobileChrome(false);
      mobileChromeTimerRef.current = null;
    }, 5000);
  }, [clearMobileChromeTimer, isTouchViewport]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateViewportMode = () => {
      const touchViewport = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 1024;
      setIsTouchViewport(touchViewport);
      setShowMobileChrome(current => (touchViewport ? current : true));
      if (!touchViewport) {
        clearMobileChromeTimer();
      }
    };

    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);

    return () => {
      window.removeEventListener("resize", updateViewportMode);
      clearMobileChromeTimer();
    };
  }, [clearMobileChromeTimer]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    type FullscreenCapableElement = HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    type FullscreenCapableVideo = HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitDisplayingFullscreen?: boolean;
    };
    type FullscreenCapableDocument = Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };

    const isMobileViewport = () =>
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 1024;
    const fullscreenVideo = videoRef.current;

    const markFullscreenTransition = () => {
      fullscreenTransitionUntilRef.current = Date.now() + 1500;
    };

    const isInFullscreen = () => {
      const doc = document as FullscreenCapableDocument;
      const video = videoRef.current as FullscreenCapableVideo | null;

      return Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        video?.webkitDisplayingFullscreen,
      );
    };

    const enterFullscreen = async () => {
      const container = playerRef.current as FullscreenCapableElement | null;
      const video = videoRef.current as FullscreenCapableVideo | null;
      if (!container || !video) return;

      try {
        if (isInFullscreen()) return;
        markFullscreenTransition();
        if (container.requestFullscreen) {
          await container.requestFullscreen();
          autoFullscreenRef.current = true;
          return;
        }
        if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
          autoFullscreenRef.current = true;
          return;
        }
        if (video.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
          autoFullscreenRef.current = true;
        }
      } catch {}
    };

    const exitFullscreen = async () => {
      const doc = document as FullscreenCapableDocument;
      const video = videoRef.current as FullscreenCapableVideo | null;

      try {
        markFullscreenTransition();
        if (doc.fullscreenElement) {
          await doc.exitFullscreen();
        } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (video?.webkitDisplayingFullscreen) {
          // iOS Safari does not provide a safe programmatic exit here.
          return;
        }
      } catch {}
    };

    const resumeAfterFullscreenExit = () => {
      if (isInFullscreen()) return;

      markFullscreenTransition();

      const video = videoRef.current;
      if (!video) return;

      window.setTimeout(() => {
        if (isInFullscreen() || !video.paused) return;

        video.play()
          .then(() => {
            setAutoplayFailed(false);
          })
          .catch(() => {
            void restoreToLive();
          });
      }, 150);
    };

    const syncOrientationFullscreen = () => {
      if (!isMobileViewport()) return;
      const isLandscape = window.innerWidth > window.innerHeight;

      if (isLandscape) {
        void enterFullscreen();
        return;
      }

      if (autoFullscreenRef.current || isInFullscreen()) {
        void exitFullscreen();
        autoFullscreenRef.current = false;
      }
    };

    const syncAutoFullscreenState = () => {
      if (!isInFullscreen()) {
        autoFullscreenRef.current = false;
      }
    };

    const handleFullscreenChange = () => {
      syncAutoFullscreenState();
      if (!isInFullscreen()) {
        resumeAfterFullscreenExit();
      }
    };

    syncOrientationFullscreen();

    window.addEventListener("resize", syncOrientationFullscreen);
    window.screen.orientation?.addEventListener?.("change", syncOrientationFullscreen);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);
    fullscreenVideo?.addEventListener("webkitendfullscreen", resumeAfterFullscreenExit as EventListener);

    return () => {
      window.removeEventListener("resize", syncOrientationFullscreen);
      window.screen.orientation?.removeEventListener?.("change", syncOrientationFullscreen);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange as EventListener);
      fullscreenVideo?.removeEventListener("webkitendfullscreen", resumeAfterFullscreenExit as EventListener);
    };
  }, [restoreToLive, setAutoplayFailed]);

  // Keep the media session active whenever audio is audible — either the video
  // element is playing, or we're in audio-fallback mode (background tab/locked screen).
  // Without this, iOS drops the Control Center widget the moment the video pauses.
  const isAudioActive = bgAudio.mode === "audio";
  useMediaSession({
    active: isPlaying || isAudioActive,
    title,
    ariaLabel,
    poster,
    artwork,
    onPlay: () => {
      if (isAudioActive) {
        // Resume background audio from Control Center.
        const a = bgAudio.getAudioEl();
        if (a?.paused) a.play().catch(() => {});
      } else {
        videoRef.current?.play().catch(() => {});
      }
    },
    onPause: () => {
      // Live stream — prevent pausing. Re-play whichever element is active.
      if (isAudioActive) {
        const a = bgAudio.getAudioEl();
        if (a?.paused) a.play().catch(() => {});
      } else {
        videoRef.current?.play().catch(() => {});
      }
    },
  });

  return (
    <div className="w-full">
      <div
        ref={playerRef}
        className="relative w-full overflow-hidden border bg-black shadow-sm"
        onPointerUp={() => {
          revealMobileChrome();
        }}
        style={{ touchAction: "manipulation" }}
      >
        <div className="aspect-video">
          <video
            ref={videoRef}
            poster={poster}
            playsInline
            autoPlay
            muted={ivs.isMuted}
            preload="auto"
            aria-label={ariaLabel}
            className={`h-full w-full object-contain transition duration-200 ${shouldBlur ? "blur-sm" : ""}`}
            style={{ userSelect: "none", touchAction: "manipulation" }}
          />
        </div>

        {pip.isPiPSupported && (!isTouchViewport || showMobileChrome) && (
          <div className="absolute top-3 right-3 z-40">
            <button
              type="button"
              onClick={() => {
                revealMobileChrome();
                if (pip.isInPiP) {
                  pip.exitPiP();
                  return;
                }
                void pip.enterPiP();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/85 focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label={pip.isInPiP ? "Exit picture in picture" : "Open picture in picture"}
              title={pip.isInPiP ? "Exit picture in picture" : "Open picture in picture"}
            >
              {pip.isInPiP ? <Minimize2 className="h-4 w-4" /> : <PictureInPicture2 className="h-4 w-4" />}
            </button>
          </div>
        )}

        {isTouchViewport && showMobileChrome && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-30 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm lg:hidden">
            <span className="inline-flex items-center gap-1.5">
              <Expand className="h-3 w-3" />
              Rotate for fullscreen
            </span>
          </div>
        )}

        {/* Loading / ended overlay */}
        {shouldBlur && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm pointer-events-none">
            {isLoading && (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                  {ivs.isPlayerReady ? "Connecting to live webinar…" : "Preparing live webinar…"}
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

        {/* Autoplay blocked */}
        {showStartGate && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <button
              type="button"
              onClick={async () => {
                await ivs.handleManualPlay();
                // Audio primes via useEffect once isPlaying becomes true.
              }}
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

        {/* Unmute nudge */}
        {showUnmuteNudge && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={ivs.tapToUnmute}
              className="flex flex-col items-center gap-3 rounded-2xl bg-black/80 px-8 py-6 text-white shadow-xl backdrop-blur-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <svg viewBox="0 0 24 24" className="h-10 w-10 shrink-0" fill="currentColor" aria-hidden="true">
                <path d="M16.5 12A4.5 4.5 0 0 0 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.21 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27 7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21 21 19.73 12 10.73 4.27 3ZM12 4L9.91 6.09 12 8.18V4Z" />
              </svg>
              <span className="text-base font-semibold">Tap to unmute</span>
            </button>
          </div>
        )}

        {/* Stats */}
        {showStats && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            <div>State: {effectiveState ?? "…"}</div>
            <div>Latency: {typeof ivs.stats.latency === "number" ? `${ivs.stats.latency.toFixed(1)}s` : "…"}</div>
            <div>Bitrate: {ivs.stats.bitrate ? `${ivs.stats.bitrate} kbps` : "…"}</div>
            <div>Res: {ivs.stats.resolution ?? "…"}</div>
            {/* <div>Mode: {backgroundAudioEnabled ? bgAudio.mode : "video"}</div> */}
          </div>
        )}
      </div>
    </div>
  );
}
