"use client";

import { useEffect, useRef } from "react";
import { useAttachVideo } from "@/broadcast/hooks/use-attach-video";
import { useVideoInjectionPlayer } from "../hooks/use-video-injection-player";

// Minimal valid silent MP4 (~160 bytes) used to "unlock" the video element
// on iOS low-power mode.  Playing this from a user-gesture handler marks the
// element as gesture-activated so future programmatic .play() calls succeed.
const SILENT_MP4 =
  "data:video/mp4;base64," +
  "AAAAHGZ0eXBNNFYgAAACAGlzb21pc28yYXZjMQAAAAhmcmVlAAAAGW1kYXQA" +
  "AAGzABAHAAABthBgUYI9t+8AAAMNbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAA" +
  "AAAD6AAAACoAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAA" +
  "AAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC" +
  "AAACGHRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAKgAAAAAA" +
  "AAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAa" +
  "AAAAGgAAAAAAJGVkdHMAAAAcZWxzdAAAAAAAAAABAAAAKgAAAAAAAQAAAAABkG1k" +
  "aWEAAAAgbWRoZAAAAAAAAAAAAAAAAAB1MAAAdTAVxwAAAAAALWhkbHIAAAAAAAAA" +
  "AHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABO21pbmYAAAAUdm1oZAAA" +
  "AAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAA" +
  "APtzdGJsAAAAl3N0c2QAAAAAAAAAAQAAAIdhdmMxAAAAAAAAAAEAAAAAAAAAAAAA" +
  "AAAAAAAAABoAGgBIAAAASAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" +
  "AAAAAAAAAAAAGP//AAAAMmF2Y0MBTUAo/+EAGWdNQCj0CAIW3AEAAAPpAADqYA" +
  "8UKkgBAAVoz5JLAAAAGGFwYXMAAAAAAAAAEgAAABBzdHRzAAAAAAAAAAAAAAAS" +
  "c3RzYwAAAAAAAAAAAAAQc3RzegAAAAAAAAAAAAAAEHN0Y28AAAAAAAAAAA==";

export function VideoInjectionPlayer() {
  const { isActive, playbackUrl, elapsedSeconds } =
    useVideoInjectionPlayer();

  const videoRef = useAttachVideo(
    isActive && playbackUrl ? playbackUrl : undefined
  );
  const hasSeeked = useRef(false);
  const isPrimed = useRef(false);

  // Prime the video element on the first user gesture (click / tap).
  // This unlocks programmatic .play() on iOS low-power mode.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const prime = () => {
      if (isPrimed.current) return;

      const prev = video.src;
      video.src = SILENT_MP4;
      video.muted = true;
      video
        .play()
        .then(() => {
          video.pause();
          isPrimed.current = true;
        })
        .catch(() => {
          // gesture didn't take — leave primed false so we try again
        })
        .finally(() => {
          // Restore previous src (or clear) so useAttachVideo stays in control
          if (prev && prev !== SILENT_MP4) {
            video.src = prev;
          } else {
            video.removeAttribute("src");
            video.load();
          }
          video.muted = false;
        });
    };

    document.addEventListener("click", prime, { once: true });
    document.addEventListener("touchstart", prime, { once: true });

    return () => {
      document.removeEventListener("click", prime);
      document.removeEventListener("touchstart", prime);
    };
  }, [videoRef]);

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
