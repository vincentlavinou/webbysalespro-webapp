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

  // Pause the injection video the moment we hand control back to the live stream.
  useEffect(() => {
    if (!isActive) {
      videoRef.current?.pause();
    }
  }, [isActive, videoRef]);

  // Always mount the <video> so the ref stays alive for priming.
  // Only show the overlay when injection is active.
  return (
    <div
      className={
        isActive && playbackUrl
          ? "absolute inset-0 z-20 bg-black"
          : "absolute inset-0 z-20 pointer-events-none opacity-0"
      }
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
        onEnded={() => {
          window.dispatchEvent(new CustomEvent("video-injection:ended"));
        }}
      />
    </div>
  );
}
