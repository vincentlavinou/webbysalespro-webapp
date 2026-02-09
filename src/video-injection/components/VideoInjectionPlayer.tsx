"use client";

import { useEffect, useRef } from "react";
import { useAttachVideo } from "@/broadcast/hooks/use-attach-video";
import { useVideoInjectionPlayer } from "../hooks/use-video-injection-player";

export function VideoInjectionPlayer() {
  const { isActive, playbackUrl, elapsedSeconds } =
    useVideoInjectionPlayer();
  console.log(`Is Active: ${isActive}, Playback Url: ${playbackUrl}`)
  const videoRef = useAttachVideo(
    isActive && playbackUrl ? playbackUrl : undefined
  );
  const hasSeeked = useRef(false);

  // Reset seek flag when the source changes
  useEffect(() => {
    hasSeeked.current = false;
  }, [playbackUrl]);

  // Once video is ready: seek to elapsed position and play
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    const seekAndPlay = () => {
      const seekTo = elapsedSeconds ?? 0;
      if (!hasSeeked.current && seekTo > 0) {
        video.currentTime = seekTo;
      }
      hasSeeked.current = true;
      video.play().catch(() => {
        // Browser blocked unmuted autoplay — retry muted as fallback
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    if (video.readyState >= 2) {
      seekAndPlay();
    } else {
      video.addEventListener("canplay", seekAndPlay, { once: true });
      return () => video.removeEventListener("canplay", seekAndPlay);
    }
  }, [videoRef, isActive, elapsedSeconds]);

  if (!isActive || !playbackUrl) return null;

  return (
    <div className="absolute inset-0 z-20 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
        onEnded={() => {
          // Auto-hide is handled by the provider listening for natural end
          // We dispatch a custom event the provider can listen to, or just
          // rely on the duration-based auto-hide. For simplicity, we
          // set a global event.
          window.dispatchEvent(new CustomEvent("video-injection:ended"));
        }}
      />
    </div>
  );
}
