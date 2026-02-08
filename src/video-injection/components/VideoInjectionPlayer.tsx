"use client";

import { useEffect, useRef } from "react";
import { useAttachVideo } from "@/broadcast/hooks/use-attach-video";
import { useVideoInjectionPlayer } from "../hooks/use-video-injection-player";

export function VideoInjectionPlayer() {
  const { isActive, playbackUrl, elapsedSeconds } =
    useVideoInjectionPlayer();
  const videoRef = useAttachVideo(
    isActive && playbackUrl ? playbackUrl : undefined
  );
  const hasSeeked = useRef(false);

  // Seek to elapsed position once the video is ready
  useEffect(() => {
    hasSeeked.current = false;
  }, [playbackUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive || hasSeeked.current) return;

    const seekTo = elapsedSeconds ?? 0;
    if (seekTo <= 0) {
      hasSeeked.current = true;
      return;
    }

    const handleCanPlay = () => {
      if (!hasSeeked.current && video.readyState >= 2) {
        video.currentTime = seekTo;
        hasSeeked.current = true;
      }
    };

    if (video.readyState >= 2) {
      video.currentTime = seekTo;
      hasSeeked.current = true;
    } else {
      video.addEventListener("canplay", handleCanPlay, { once: true });
      return () => video.removeEventListener("canplay", handleCanPlay);
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
